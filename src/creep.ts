import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');
import fun = require('./functional');
import enums = require('./enums');

export interface CreepToBeSpawned {
    creepName: string;
    bodyParts: string[];
}

export interface Target {
    targetType: ETargetType
    targetId: string
}
export interface ETargetType { targetType: string };
export const eSpawn: ETargetType = { targetType: "Spawn" };
export const eSource: ETargetType = { targetType: "Source" };
export const eCreep: ETargetType = { targetType: "Creep" };
export const eController: ETargetType = { targetType: "Controller" };
export const eTower: ETargetType = { targetType: "Tower" };
export const eExtension: ETargetType = { targetType: "Extension" };
export const eContainer: ETargetType = { targetType: "Container" };

export interface ECreepType { creepType: string };
export const eHarvester: ECreepType = { creepType: "Harvester" };
export const eUpdater: ECreepType = { creepType: "Updater" };
export const eBuilder: ECreepType = { creepType: "Builder" };
export const eTransporter: ECreepType = { creepType: "Transporter" };

interface WorkerMemory extends CreepMemory {
    action: EWorkerAction
    target: Target
}
interface EWorkerAction { action: string }
const eBuild: EWorkerAction = { action: "Build" };
const eHarvest: EWorkerAction = { action: "Harvest" };
const eUpdate: EWorkerAction = { action: "Update" };

interface GiverMemory extends CreepMemory {
    destinations: Target[]
}

interface TakerMemory extends CreepMemory {
    sources: Target[]
}

interface IfThenElseMemory extends CreepMemory {
    condition: ECreepCondition
    thenPart: CreepMemory
    elsePart: CreepMemory
}

interface TransporterMemory extends CreepMemory {
    sources: Target[];
    destinations: Target[];
}

interface ECreepCondition { name: string }
const eIsFull: ECreepCondition = { name: "IsFull" };
const eIsEmpty: ECreepCondition = { name: "IsEmpty" };

export function process(creep: Creep) {

    if (creep.spawning) {
        return;
    }

    if (creep.hits == 0 || creep.ticksToLive <= 0) {
        var creepMemories = Memory.creeps;
        delete creepMemories[creep.name];
        return;
    }

    var creepMemory = memoryUtils.creepMemory(creep);
    processCreepWithMemory(creep, creepMemory);
}

function makeHarvestorMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var thenPart: GiverMemory = {
        creepMemoryType: enums.eGiverMemory,
        destinations: destinations
    };
    if (sources.length != 1) {
        log.error(() => `creep/makeHarvestorMemory: Exactly one source expected, found: ${sources.length}`);
        return null;
    }
    var elsePart: WorkerMemory = {
        creepMemoryType: enums.eWorkerMemory,
        action: eHarvest,
        target: sources[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsFull,
        thenPart: thenPart,
        elsePart: elsePart
    }
}

function makeTransporterMemory(sources: Target[], destinations: Target[]): TransporterMemory {
    return {
        creepMemoryType: enums.eTransporterMemory,
        sources: sources,
        destinations: destinations
    };
}

function makeUpdaterMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var takerMemory: TakerMemory = {
        creepMemoryType: enums.eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(() => `creep/makeUpdaterMemory: Exactly one destination expected, found ${destinations.length}`)
        return null;
    }
    var updaterMemory: WorkerMemory = {
        creepMemoryType: enums.eWorkerMemory,
        action: eUpdate,
        target: destinations[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: updaterMemory
    }
}

function makeBuilderMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var takerMemory: TakerMemory = {
        creepMemoryType: enums.eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(() => `creep/makeUpdaterMemory: Exactly one destination expected, found ${destinations.length}`)
        return null;
    }
    var builderMemory: WorkerMemory = {
        creepMemoryType: enums.eWorkerMemory,
        action: eBuild,
        target: destinations[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: builderMemory
    }
}

export function makeCreepMemory(creepType: ECreepType, sources: Target[], destinations: Target[]): CreepMemory {
    switch (creepType.creepType) {
        case eHarvester.creepType:
            return makeHarvestorMemory(sources, destinations);
        case eTransporter.creepType:
            return makeTransporterMemory(sources, destinations);
        case eUpdater.creepType:
            return makeUpdaterMemory(sources, destinations);
        case eBuilder.creepType:
            return makeBuilderMemory(sources, destinations);
        default:
            log.error(() => `creep/makeCreepMemory: Creep type ${creepType.creepType} not supported.`);
            return null;
    }
}

function distanceHeuristic(pos1: RoomPosition, pos2: RoomPosition): number {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    return Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20);
}

function resetContainerEnergy(te: TargetEnergy, hardCodedContainerEnergy: number): number {
    if (te.target.targetType != eContainer)
        return te.energy;
    else {
        var container = Game.getObjectById<Container>(te.target.targetId);
        return te.energy / hardCodedContainerEnergy * (container.store / container.storeCapacity);
    }
}

function processTransporterMemory(creep: Creep, transporterMemory: TransporterMemory) {
    var maxSourceEnergy = fun.maxBy<TargetEnergy>(
        transporterMemory.sources.map<TargetEnergy>((source: Target) => getEnergy(source, .0000001)),
        (e: TargetEnergy) => {
            return e.energy
                / distanceHeuristic(creep.pos, Game.getObjectById<RoomObject>(e.target.targetId).pos);
        });

    var minDestinationEnergy = fun.maxBy<TargetEnergy>(
        transporterMemory.destinations.map<TargetEnergy>((destination: Target) => getEnergy(destination, .9999999)),
        (e: TargetEnergy) => {
            return (1 - e.energy)
                / distanceHeuristic(creep.pos, Game.getObjectById<RoomObject>(e.target.targetId).pos);
        }).map<TargetEnergy>(
        (teIn: TargetEnergy) => {
            return { energy: (1 - teIn.energy), target: teIn.target };
        });

    if (!maxSourceEnergy.isPresent && !minDestinationEnergy.isPresent) {
        log.error(() =>
            `creep/processTransporterMemory: creep ${creep.name} has `
            + `${transporterMemory.sources.length} sources and `
            + `${transporterMemory.destinations.length} destinations.`
        );
    } else if (!maxSourceEnergy.isPresent) {
        return give(creep, minDestinationEnergy.get.target);
    } else if (!minDestinationEnergy.isPresent) {
        return take(creep, maxSourceEnergy.get.target);
    } else {
        var takeAppeal = resetContainerEnergy(maxSourceEnergy.get, .0000001) * (1 - creep.carry.energy / creep.carryCapacity);
        var giveAppeal = resetContainerEnergy(minDestinationEnergy.get, .9999999) * creep.carry.energy / creep.carryCapacity;
        console.log(`creep ${creep.name} has appeals ${takeAppeal} ${giveAppeal}`);
        if (takeAppeal > giveAppeal || giveAppeal == 0) {
            return take(creep, maxSourceEnergy.get.target);
        } else {
            return give(creep, minDestinationEnergy.get.target);
        }
    }
}

function processCreepWithMemory(creep: Creep, creepMemory: CreepMemory) {
    switch (creepMemory.creepMemoryType.name) {
        case enums.eWorkerMemory.name:
            processWorker(creep, <WorkerMemory>creepMemory);
            break;
        case enums.eGiverMemory.name:
            processGiver(creep, <GiverMemory>creepMemory);
            break;
        case enums.eTakerMemory.name:
            processTaker(creep, <TakerMemory>creepMemory);
            break;
        case enums.eIfThenElseMemory.name:
            processIfThenElse(creep, <IfThenElseMemory>creepMemory);
            break;
        case enums.eTransporterMemory.name:
            processTransporterMemory(creep, <TransporterMemory>creepMemory);
            break;
        default:
            log.error(() => `Unexpected creepMemoryType ${creepMemory.creepMemoryType.name} for creep ${creep.name}.`);
            break;
    }
}

function processWorker(creep: Creep, memory: WorkerMemory) {
    if (memory.action.action == eHarvest.action) {
        if (memory.target.targetType.targetType != eSource.targetType) {
            return log.error(() => "creep/processWorker: action HARVEST used with targetType" + memory.target.targetType);
        }
        var source = Game.getObjectById<Source>(memory.target.targetId);
        if (source == null || source === undefined) {
            return log.error(() => `creep/processWorker: action HARVEST could not find source id ${memory.target.targetId}`);
        }
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
        return;
    } else if (memory.action.action == eUpdate.action) {
        if (memory.target.targetType.targetType != eController.targetType) {
            return log.error(() => `creep/processWorker: action ${memory.action.action} used with targetType ${memory.target.targetType.targetType}`);
        }
        var controller = Game.getObjectById<Controller>(memory.target.targetId);
        if (controller == null || controller === undefined) {
            return log.error(() => `creep/processWorker: action ${memory.action.action} could not find controller with id ${memory.target.targetId}`);
        }
        var dx = creep.pos.x - controller.pos.x, dy = creep.pos.y - controller.pos.y;
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE || (dx * dx + dy * dy > 8)) {
            creep.moveTo(controller);
        }
        return;
    } else if (memory.action.action == eBuild.action) {
        var site = creep.pos.findClosestByRange<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);
        if (site !== undefined && site != null
            && site.progress !== undefined && site.progressTotal !== undefined
            && site.progress < site.progressTotal) {
            if (creep.build(site) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site);
            }
            return;
        }
        var structures = creep.room.find<Structure>(FIND_STRUCTURES).filter(
            function (s) { return s.structureType != STRUCTURE_CONTROLLER; }
        );
        var weakestStructure = fun.maxBy(structures, function (s) {
            var dx = s.pos.x - creep.pos.x;
            var dy = s.pos.y - creep.pos.y;
            var res = (Math.min(s.hitsMax, 100000) / s.hits) / (Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20));
            return res;
        });
        if (weakestStructure.isPresent) {
            var structure = weakestStructure.get;
            log.debug(() => `repairing structure ${structure.structureType}`);
            if (creep.repair(structure) == ERR_NOT_IN_RANGE)
                creep.moveTo(structure);
        };
        return;
    } else {
        return log.error(() => `creep/processWorker: unexpected action ${memory.action.action}.`);
    }
}

function take(creep: Creep, maxTarget: Target) {
    switch (maxTarget.targetType.targetType) {
        case eCreep.targetType: {
            var giver = Game.getObjectById<Creep>(maxTarget.targetId);
            if (giver == null || giver == undefined)
                return log.error(() => `creep/take: could not find creep ${maxTarget.targetId}`);
            if (giver.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(giver);
            return;
        }
        case eContainer.targetType: {
            var container = Game.getObjectById<Container>(maxTarget.targetId);
            if (container == null || container == undefined)
                return log.error(() => `creep/take: could not find container ${maxTarget.targetId}`);
            if (container.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(container);
            return;
        }
        default:
            return log.error(() => `creep/take: targetType ${maxTarget.targetType.targetType} not supported.`);
    }
}

function processTaker(creep: Creep, memory: TakerMemory) {
    var energies: Array<{ energy: number, target: Target }> = memory.sources.map((t: Target) => { return getEnergy(t, .0000000001); });
    var maxEnergy = fun.maxBy<{ energy: number, target: Target }>(
        energies,
        ((x: { energy: number }) => { return x.energy; })
    );
    if (!maxEnergy.isPresent) {
        return log.error(() => `creep/processGiver: creep ${creep.name} has only ${memory.sources.length} destinations`);
    }
    var maxTarget = maxEnergy.get.target;
    return take(creep, maxTarget);
}

interface TargetEnergy {
    target: Target;
    energy: number;
}

function getEnergy(target: Target, containerEnergy: number): TargetEnergy {
    switch (target.targetType.targetType) {
        case eTower.targetType:
        case eSpawn.targetType:
        case eExtension.targetType:
        case eSource.targetType: {
            var source = Game.getObjectById<Tower | Spawn | Extension | Source>(target.targetId);
            return { energy: source.energy / source.energyCapacity, target: target }
        }
        case eContainer.targetType: {
            var container = Game.getObjectById<Container>(target.targetId);
            return { energy: containerEnergy, target: target }; // fill containers after everything else is full
        }
        case eCreep.targetType: {
            var creep = Game.getObjectById<Creep>(target.targetId);
            return { energy: creep.carry.energy / creep.carryCapacity, target: target };
        }
        case eController.targetType: {
            var controller = Game.getObjectById<Controller>(target.targetId);
            return { energy: controller.progress / controller.progressTotal, target: target };
        }
        default: {
            log.error(() => `creep/getEnergy: Could not identify targetType ${target.targetType.targetType}.`);
            return { energy: 0, target: target };
        }
    }
}

function give(creep: Creep, minTarget: Target) {
    switch (minTarget.targetType.targetType) {
        case eCreep.targetType: {
            var taker = Game.getObjectById<Creep>(minTarget.targetId);
            if (taker == null || taker == undefined)
                return log.error(() => `creep/give: could not find creep ${minTarget.targetId}`);
            if (creep.transfer(taker, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(taker);
            return;
        }
        case eSpawn.targetType:
        case eTower.targetType:
        case eExtension.targetType:
        case eContainer.targetType: {
            var spawn = Game.getObjectById<Spawn | Tower | Extension | Container>(minTarget.targetId);
            if (spawn == null || spawn === undefined)
                return log.error(() => `creep/give: could not find spawn ${minTarget.targetId}`);
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(spawn);
            return;
        }
        case eController.targetType: {
            if (creep.getActiveBodyparts(WORK) > 0) {
                var controller = Game.getObjectById<Controller>(minTarget.targetId);
                if (controller == null || controller === undefined) {
                    return log.error(() => `creep/give: Creep ${creep.name} could not find controller ${controller.id}`);
                }
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
                return;
            }
            log.error(() => `creep/give: Creep ${creep.name} does not have WORK parts to upgrade controller ${minTarget.targetId}`);
            return;
        }
        default: {
            return log.error(() => `creep/give: targetType ${minTarget.targetType.targetType} not yet supported.`);
        }
    }
}

function processGiver(creep: Creep, memory: GiverMemory) {
    var energies: Array<{ energy: number, target: Target }> = memory.destinations.map((t: Target) => { return getEnergy(t, .999999999); });
    var minEnergy = fun.maxBy<{ energy: number, target: Target }>(
        energies,
        ((x: { energy: number }) => { return x.energy * -1; })
    );
    if (!minEnergy.isPresent) {
        return log.error(() => `creep/processGiver: creep ${creep.name} has only ${memory.destinations.length} destinations`);
    }
    var minTarget = minEnergy.get.target;
    return give(creep, minTarget);
}

function processIfThenElse(creep: Creep, memory: IfThenElseMemory) {
    switch (memory.condition.name) {
        case eIsFull.name:
            if (creep.carry.energy == creep.carryCapacity)
                return processCreepWithMemory(creep, memory.thenPart);
            else
                return processCreepWithMemory(creep, memory.elsePart);
        case eIsEmpty.name:
            if (creep.carry.energy == 0)
                return processCreepWithMemory(creep, memory.thenPart);
            else
                return processCreepWithMemory(creep, memory.elsePart);
        default:
            return log.error(() => `creep/processIfThenElse: condition ${memory.condition} not yet supported.`);
    }
}

function createBodyPartsImpl(partsToInclude: string[], energy: number): string[] {
    var body: string[] = [];
    for (var idx = 0; BODYPART_COST[partsToInclude[idx]] <= energy; idx = (idx + 1) % partsToInclude.length) {
        energy = energy - BODYPART_COST[partsToInclude[idx]];
        body.push(partsToInclude[idx]);
    }
    return body;
}

export function createBodyParts(creepType: ECreepType, energy: number): string[] {
    switch (creepType.creepType) {
        case eHarvester.creepType:
        case eUpdater.creepType:
        case eBuilder.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, MOVE, MOVE], energy);
        case eTransporter.creepType:
            return createBodyPartsImpl([MOVE, CARRY], energy);
        default:
            log.error(() => `creep/createBodyParts: Creep type ${creepType.creepType} not yet supported.`);
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}