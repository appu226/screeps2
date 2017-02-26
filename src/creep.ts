import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');
import fun = require('./functional');
import enums = require('./enums');

const eGiverMemory: ECreepMemoryType = { name: "GiverMemory" };
const eWorkerMemory: ECreepMemoryType = { name: "WorkerMemory" };
const eIfThenElseMemory: ECreepMemoryType = { name: "IfThenElseMemory" };
const eTakerMemory: ECreepMemoryType = { name: "TakerMemory" };
const eTransporterMemory: ECreepMemoryType = { name: "TransporterMemory" };
const eClaimerMemory: ECreepMemoryType = { name: "ClaimerMemory" };
const eSpawnBuilderMemory: ECreepMemoryType = { name: "SpawnBuilderMemory" };
const eActiveNinjaMemory: ECreepGroupType = { name: "ActiveNinjaMemory" };
const eRegroupingNinjaMemory: ECreepGroupType = { name: "RegroupingNinjaMemory" };

export interface CreepToBeSpawned {
    creepName: string;
    bodyParts: string[];
    registerSuccess: () => void;
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
export const eClaimer: ECreepType = { creepType: "Claimer" };
export const eSpawnBuilder: ECreepType = { creepType: "SpawnBuilder" };

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

interface ClaimerMemory extends CreepMemory {
    roomName: string;
}

interface SpawnBuilderMemory extends CreepMemory {
    constructionSiteId: string;
}

interface ActiveNinjaMemory extends CreepMemory {
    roomName: string;
}

interface RegroupingNinjaMemory extends CreepMemory {
    regroupingPos: mapUtils.XY;
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
        creepMemoryType: eGiverMemory,
        destinations: destinations
    };
    if (sources.length != 1) {
        log.error(() => `creep/makeHarvestorMemory: Exactly one source expected, found: ${sources.length}`);
        return null;
    }
    var elsePart: WorkerMemory = {
        creepMemoryType: eWorkerMemory,
        action: eHarvest,
        target: sources[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsFull,
        thenPart: thenPart,
        elsePart: elsePart
    }
}

function makeTransporterMemory(sources: Target[], destinations: Target[]): TransporterMemory {
    return {
        creepMemoryType: eTransporterMemory,
        sources: sources,
        destinations: destinations
    };
}

function makeSpawnBuilderMemory(constructionSite: ConstructionSite): SpawnBuilderMemory {
    return {
        creepMemoryType: eSpawnBuilderMemory,
        constructionSiteId: constructionSite.id
    };
}

function makeClaimerMemory(roomName: string): ClaimerMemory {
    return {
        creepMemoryType: eClaimerMemory,
        roomName: roomName
    };
}

function makeUpdaterMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var takerMemory: TakerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(() => `creep/makeUpdaterMemory: Exactly one destination expected, found ${destinations.length}`)
        return null;
    }
    var updaterMemory: WorkerMemory = {
        creepMemoryType: eWorkerMemory,
        action: eUpdate,
        target: destinations[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: updaterMemory
    }
}

function makeBuilderMemory(sources: Target[], destinations: Target[]): IfThenElseMemory {
    var takerMemory: TakerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(() => `creep/makeUpdaterMemory: Exactly one destination expected, found ${destinations.length}`)
        return null;
    }
    var builderMemory: WorkerMemory = {
        creepMemoryType: eWorkerMemory,
        action: eBuild,
        target: destinations[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: builderMemory
    }
}

export function makeActiveNinjaMemory(roomName: string): ActiveNinjaMemory {
    return {
        creepMemoryType: eActiveNinjaMemory,
        roomName: roomName
    };
}

export function makeRegroupingNinjaMemory(regroupingPos: mapUtils.XY): RegroupingNinjaMemory {
    return {
        creepMemoryType: eRegroupingNinjaMemory,
        regroupingPos: regroupingPos
    };
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
            var ret = (1 - e.energy)
                / distanceHeuristic(creep.pos, Game.getObjectById<RoomObject>(e.target.targetId).pos);
            return ret;
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
        log.debug(() => `creep ${creep.name} has appeals ${takeAppeal} ${giveAppeal}`);
        if (takeAppeal > giveAppeal || (giveAppeal == takeAppeal && creep.carry.energy < creep.carryCapacity / 2)) {
            return take(creep, maxSourceEnergy.get.target);
        } else {
            return give(creep, minDestinationEnergy.get.target);
        }
    }
}

function moveToRoom(creep: Creep, roomName: string) {
    var exitDir = <number>Game.map.findExit(creep.room, roomName);
    if (exitDir == ERR_INVALID_ARGS)
        return log.error(() => `creep/moveToRoom: findExit(${creep.room.name}, ${roomName}) gave ERR_INVALID_ARGS for creep ${creep.name}.`);
    else if (exitDir == ERR_NO_PATH)
        return log.error(() => `creep/moveToRoom: findExit(${creep.room.name}, ${roomName}) gave ERR_NO_PATH for creep ${creep.name}.`);
    else {
        var exit = creep.pos.findClosestByRange<RoomPosition>(exitDir);
        return creep.moveTo(exit, memoryUtils.enrichedMemory().pathReuse);
    }
}

function processClaimerMemory(creep: Creep, claimerMemory: ClaimerMemory) {
    if (creep.room.name != claimerMemory.roomName) {
        return moveToRoom(creep, claimerMemory.roomName);
    }
    var controller = creep.room.controller;
    if (creep.claimController(controller) == ERR_NOT_IN_RANGE)
        creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
}

function processSpawnBuilderMemory(creep: Creep, spawnBuilderMemory: SpawnBuilderMemory) {
    var constructionSite = Game.getObjectById<ConstructionSite>(spawnBuilderMemory.constructionSiteId);
    if (constructionSite == null || constructionSite === undefined) {
        return log.error(() => `creep/processSpawnBuilderMemory: ${creep.name} could not find construction site with id ${spawnBuilderMemory.constructionSiteId}`);
    } else if (creep.room.name !== constructionSite.room.name) {
        return moveToRoom(creep, constructionSite.room.name);
    } else {
        var buildAppeal = creep.carry.energy / creep.carryCapacity / distanceHeuristic(creep.pos, constructionSite.pos);
        var closestSource = creep.pos.findClosestByPath<Source>(FIND_SOURCES);
        if (closestSource == null || closestSource === undefined) {
            return log.error(() => `creep/processSpawnBuilderMemory: creep ${creep.name} could not find a source to harvest.`)
        }
        var refillAppeal = (1 - creep.carry.energy / creep.carryCapacity) / distanceHeuristic(creep.pos, closestSource.pos);
        if (buildAppeal > refillAppeal) {
            if (creep.build(constructionSite) == ERR_NOT_IN_RANGE) {
                creep.moveTo(constructionSite, memoryUtils.enrichedMemory().pathReuse);
            }
            return;
        } else {
            if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestSource, memoryUtils.enrichedMemory().pathReuse);
            }
            return;
        }
    }
}

function ninjaHeal(
    creep: Creep, anm: ActiveNinjaMemory,
    canHeal: boolean, canRangeHeal: boolean, canMove: boolean) {
    var patients = mapUtils.patients(anm.roomName).filter(
        creep => creep.hits < creep.hitsMax
    );
    var closestOpt = fun.maxBy<Creep>(
        patients,
        (patient: Creep) => mapUtils.manhattan(
            creep.pos.x, creep.pos.y,
            patient.pos.x, patient.pos.y
        )
    );
    if (closestOpt.isPresent) {
        var closest = closestOpt.get;
        var distance = mapUtils.manhattan(
            creep.pos.x, creep.pos.y,
            closest.pos.x, closest.pos.y
        );
        if (distance > 4) {
            if (canMove) creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return;
        } else if (distance > 1) {
            if (canMove) creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            if (canRangeHeal) creep.rangedHeal(closest);
            return;
        } else {
            if (canHeal) creep.heal(closest);
            else if (canRangeHeal) creep.rangedHeal(closest);
            return;
        }
    } else {
        return;
    }
}

function processActiveNinjaMemory(creep: Creep, anm: ActiveNinjaMemory) {
    if (creep.room.name != anm.roomName) {
        return moveToRoom(creep, anm.roomName);
    }
    var attackers = mapUtils.foreignAttackers(anm.roomName);
    var closestOpt = fun.maxBy<Creep>(
        attackers,
        (attacker: Creep) => mapUtils.manhattan(
            creep.pos.x, creep.pos.y,
            attacker.pos.x, attacker.pos.y) * -1
    );
    if (!closestOpt.isPresent) {
        return ninjaHeal(creep, anm, true, true, true);
    } else {
        var closest = closestOpt.get;
        var distance = mapUtils.manhattan(creep.pos.x, creep.pos.y, closest.pos.x, closest.pos.y);
        if (distance > 4) {
            creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return ninjaHeal(creep, anm, true, true, false);
        } else if (distance > 1) {
            creep.rangedAttack(closest);
            creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return ninjaHeal(creep, anm, true, false, false);
        } else {
            creep.attack(closest);
            return ninjaHeal(creep, anm, false, true, false);
        }
    }
}

function processRegroupingNinjaMemory(creep: Creep, rnm: RegroupingNinjaMemory) {
    if (mapUtils.manhattan(creep.pos.x, creep.pos.y, rnm.regroupingPos.x, rnm.regroupingPos.y) > 5)
        creep.moveTo(rnm.regroupingPos.x, rnm.regroupingPos.y, memoryUtils.enrichedMemory().pathReuse);
}

function processCreepWithMemory(creep: Creep, creepMemory: CreepMemory) {
    switch (creepMemory.creepMemoryType.name) {
        case eWorkerMemory.name:
            processWorker(creep, <WorkerMemory>creepMemory);
            break;
        case eGiverMemory.name:
            processGiver(creep, <GiverMemory>creepMemory);
            break;
        case eTakerMemory.name:
            processTaker(creep, <TakerMemory>creepMemory);
            break;
        case eIfThenElseMemory.name:
            processIfThenElse(creep, <IfThenElseMemory>creepMemory);
            break;
        case eTransporterMemory.name:
            processTransporterMemory(creep, <TransporterMemory>creepMemory);
            break;
        case eClaimerMemory.name:
            processClaimerMemory(creep, <ClaimerMemory>creepMemory);
            break;
        case eSpawnBuilderMemory.name:
            processSpawnBuilderMemory(creep, <SpawnBuilderMemory>creepMemory);
            break;
        case eActiveNinjaMemory.name:
            processActiveNinjaMemory(creep, <ActiveNinjaMemory>creepMemory);
            break;
        case eRegroupingNinjaMemory.name:
            processRegroupingNinjaMemory(creep, <RegroupingNinjaMemory>creepMemory);
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
            creep.moveTo(source, memoryUtils.enrichedMemory().pathReuse);
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
            creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
        }
        return;
    } else if (memory.action.action == eBuild.action) {
        var site = creep.pos.findClosestByRange<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);
        if (site !== undefined && site != null
            && site.progress !== undefined && site.progressTotal !== undefined
            && site.progress < site.progressTotal) {
            if (creep.build(site) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site, memoryUtils.enrichedMemory().pathReuse);
            }
            return;
        }
        var noTowers: boolean =
            creep.room.find<Structure>(
                FIND_MY_STRUCTURES
            ).filter(
                (struct: Structure) => { return struct.structureType == STRUCTURE_TOWER; }
                ).length == 0;
        if (noTowers) {
            // if the room does not have any towers, then repair structures
            var weakestStructure =
                fun.maxBy<Structure>(
                    creep.room.find<Structure>(FIND_STRUCTURES).filter(
                        (s: Structure) => {
                            return s.structureType != STRUCTURE_CONTROLLER
                                && (
                                    (<OwnedStructure>s).my === undefined
                                    || (<OwnedStructure>s).my == true
                                );
                        }),
                    (s: Structure) => { return s.hits * -1; }
                );
            if (weakestStructure.isPresent) {
                if (creep.repair(weakestStructure.get) == ERR_NOT_IN_RANGE)
                    creep.moveTo(weakestStructure.get, memoryUtils.enrichedMemory().pathReuse);
                return;
            }
        }
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
                creep.moveTo(giver, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        case eContainer.targetType: {
            var container = Game.getObjectById<Container>(maxTarget.targetId);
            if (container == null || container == undefined)
                return log.error(() => `creep/take: could not find container ${maxTarget.targetId}`);
            if (container.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(container, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        default:
            return log.error(() => `creep/take: targetType ${maxTarget.targetType.targetType} not supported for creep ${creep.name}.`);
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
            return { energy: containerEnergy, target: target }; // fill/deplete containers after everything else is full/empty
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
                creep.moveTo(taker, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(spawn, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        case eController.targetType: {
            if (creep.getActiveBodyparts(WORK) > 0) {
                var controller = Game.getObjectById<Controller>(minTarget.targetId);
                if (controller == null || controller === undefined) {
                    return log.error(() => `creep/give: Creep ${creep.name} could not find controller ${controller.id}`);
                }
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
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

export function createBodyPartsImpl(partsToInclude: string[], energy: number): string[] {
    var body: string[] = [];
    for (var idx = 0; BODYPART_COST[partsToInclude[idx]] <= energy; idx = (idx + 1) % partsToInclude.length) {
        energy = energy - BODYPART_COST[partsToInclude[idx]];
        body.push(partsToInclude[idx]);
    }
    return body;
}

export function createBodyParts(creepType: ECreepType, energy: number): string[] {
    if (energy < 300) {
        log.error(() => `creep/createBodyParts: expected at least 300 energy, got: ${energy}`);
        return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
    switch (creepType.creepType) {
        case eHarvester.creepType:
        case eBuilder.creepType:
            return [MOVE, CARRY, WORK, WORK];
        case eUpdater.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, WORK, WORK], Math.min(energy, 500));
        case eTransporter.creepType:
            return [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY];
        case eClaimer.creepType: {
            if (energy < 650)
                log.error(() => `creep/createBodyParts: cannot create claimer without at least 650 energy, got : ${energy}`);
            return createBodyPartsImpl([MOVE, CLAIM, CLAIM], Math.min(energy, BODYPART_COST[MOVE] + 2 * BODYPART_COST[CLAIM]));
        }
        case eSpawnBuilder.creepType: {
            return createBodyPartsImpl([MOVE, CARRY, MOVE, WORK], energy);
        }
        default:
            log.error(() => `creep/createBodyParts: Creep type ${creepType.creepType} not yet supported.`);
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}

export function spawnClaimer(spawn: Spawn, roomName: string) {
    var memory = makeClaimerMemory(roomName);
    var body = createBodyParts(eClaimer, spawn.room.energyAvailable);
    var name = "Claimer" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);
}

export function spawnSpawnBuilder(spawn: Spawn, constructionSite: ConstructionSite) {
    var memory = makeSpawnBuilderMemory(constructionSite);
    var body = createBodyParts(eSpawnBuilder, spawn.room.energyAvailable);
    var name = "SpawnBuilder" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);

}

export function spawnActiveNinja(spawn: Spawn, roomName: string) {
    var memory = makeActiveNinjaMemory(roomName);
    var body = createBodyPartsImpl([MOVE, HEAL, MOVE, ATTACK, MOVE, RANGED_ATTACK, MOVE, TOUGH], spawn.room.energyAvailable);
    var name = "Ninja" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);
}