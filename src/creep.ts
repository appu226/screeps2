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

function makeTransporterMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var giverMemory: GiverMemory = {
        creepMemoryType: enums.eGiverMemory,
        destinations: destinations
    };
    var takerMemory: TakerMemory = {
        creepMemoryType: enums.eTakerMemory,
        sources: sources.filter((target: Target) => target.targetType.targetType != eSource.targetType)
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsFull,
        thenPart: giverMemory,
        elsePart: takerMemory
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
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
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
        return;
    } else {
        return log.error(() => `creep/processWorker: unexpected action ${memory.action.action}.`);
    }
}

function processTaker(creep: Creep, memory: TakerMemory) {
    var energies: Array<{ energy: number, target: Target }> = memory.sources.map(getEnergy);
    var maxEnergy = fun.maxBy<{ energy: number, target: Target }>(
        energies,
        ((x: { energy: number }) => { return x.energy; })
    );
    if (!maxEnergy.isPresent) {
        return log.error(() => `creep/processGiver: creep ${creep.name} has only ${memory.sources.length} destinations`);
    }
    var maxTarget = maxEnergy.get.target;
    switch (maxTarget.targetType.targetType) {
        case eCreep.targetType: {
            var giver = Game.getObjectById<Creep>(maxTarget.targetId);
            if (giver == null || giver == undefined)
                return log.error(() => `creep/processGiver: could not find creep ${maxTarget.targetId}`);
            if (giver.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(giver);
            return;
        }
        default:
            return log.error(() => `creep/processTaker: targetType ${maxTarget.targetType.targetType} not supported.`);
    }
}

function getEnergy(target: Target): { energy: number, target: Target } {
    switch (target.targetType.targetType) {
        case eSource.targetType: {
            var source = Game.getObjectById<Source>(target.targetId);
            return { energy: source.energy / source.energyCapacity, target: target }
        }
        case eCreep.targetType: {
            var creep = Game.getObjectById<Creep>(target.targetId);
            return { energy: creep.carry.energy / creep.carryCapacity, target: target };
        }
        case eSpawn.targetType: {
            var spawn = Game.getObjectById<Spawn>(target.targetId);
            return { energy: spawn.energy / spawn.energyCapacity, target: target };
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

function processGiver(creep: Creep, memory: GiverMemory) {
    var energies: Array<{ energy: number, target: Target }> = memory.destinations.map(getEnergy);
    var minEnergy = fun.maxBy<{ energy: number, target: Target }>(
        energies,
        ((x: { energy: number }) => { return x.energy * -1; })
    );
    if (!minEnergy.isPresent) {
        return log.error(() => `creep/processGiver: creep ${creep.name} has only ${memory.destinations.length} destinations`);
    }
    var minTarget = minEnergy.get.target;
    switch (minTarget.targetType.targetType) {
        case eCreep.targetType: {
            var taker = Game.getObjectById<Creep>(minTarget.targetId);
            if (taker == null || taker == undefined)
                return log.error(() => `creep/processGiver: could not find creep ${minTarget.targetId}`);
            if (creep.transfer(taker, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(taker);
            return;
        }
        case eSpawn.targetType: {
            var spawn = Game.getObjectById<Spawn>(minTarget.targetId);
            if (spawn == null || spawn === undefined)
                return log.error(() => `creep/processGiver: could not find spawn ${minTarget.targetId}`);
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(spawn);
            return;
        }
        default: {
            return log.error(() => `creep/processGiver: targetType ${minTarget.targetType.targetType} not yet supported.`);
        }
    }
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