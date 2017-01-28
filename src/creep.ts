import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');
import fun = require('./functional');
import enums = require('./enums');

export interface CreepToBeSpawned {
    creepName: string;
    bodyParts: string[];
    creepMemory: CreepMemory;
}

export interface Target {
    targetType: ETargetType
    targetId: string
}
export interface ETargetType { targetType: string };
export var eSpawn: ETargetType = { targetType: "Spawn" };
export var eSource: ETargetType = { targetType: "Source" };
export var eCreep: ETargetType = { targetType: "Creep" };

export interface ECreepType { creepType: string };
export var eHarvester: ECreepType = { creepType: "Harvester" };
export var eUpdater: ECreepType = { creepType: "Updater" };
export var eBuilder: ECreepType = { creepType: "Builder" };
export var eTransporter: ECreepType = { creepType: "Transporter" };

interface WorkerMemory extends CreepMemory {
    action: string
    target: Target
}

interface GiverMemory extends CreepMemory {
    destinations: Target[]
}

interface TakerMemory extends CreepMemory {
    sources: Target[]
}

interface IfThenElseMemory extends CreepMemory {
    condition: string // one of {ISFULL, ISEMPTY}
    thenPart: CreepMemory
    elsePart: CreepMemory
}

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

export function makeCreepMemory(creepType: ECreepType, sources: Target[], destinations: Target[]): CreepMemory {
    switch (creepType.creepType) {
        case eHarvester.creepType: {
            var thenPart: GiverMemory = {
                creepMemoryType: enums.eGiverMemory,
                destinations: destinations
            };
            var elsePart: WorkerMemory = {
                creepMemoryType: enums.eWorkerMemory,
                action: "HARVEST",
                target: sources[0]
            };
            return <IfThenElseMemory>{
                creepMemoryType: enums.eIfThenElseMemory,
                condition: "ISFULL",
                thenPart: thenPart,
                elsePart: elsePart
            };
        }
        case eTransporter.creepType: {
            var giverMemory: GiverMemory = {
                creepMemoryType: enums.eGiverMemory,
                destinations: destinations
            };
            var takerMemory: TakerMemory = {
                creepMemoryType: enums.eTakerMemory,
                sources: sources
            };
            return <IfThenElseMemory>{
                creepMemoryType: enums.eIfThenElseMemory,
                condition: "ISFULL",
                thenPart: giverMemory,
                elsePart: takerMemory
            };
        }
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
    if (memory.action == "HARVEST") {
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
    } else {
        return log.error(() => `creep/processWorker: unexpected action ${memory.action}.`);
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
            return { energy: source.energy, target: target }
        }
        case eCreep.targetType: {
            return { energy: Game.getObjectById<Creep>(target.targetId).carry.energy, target };
        }
        case eSpawn.targetType: {
            return { energy: Game.getObjectById<Spawn>(target.targetId).energy, target };
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
    switch (memory.condition) {
        case "ISFULL":
            if (creep.carry.energy == creep.carryCapacity)
                return processCreepWithMemory(creep, memory.thenPart);
            else
                return processCreepWithMemory(creep, memory.elsePart);
        case "ISEMPTY":
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
            return createBodyPartsImpl([MOVE, CARRY, WORK, MOVE], energy);
        case eTransporter.creepType:
            return createBodyPartsImpl([MOVE, CARRY], energy);
        default:
            log.error(() => `creep/createBodyParts: Creep type ${creepType.creepType} not yet supported.`);
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}