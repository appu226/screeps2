import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');
import fun = require('./functional');

export interface CreepToBeSpawned {
    creepName: string;
    bodyParts: string[];
    creepMemory: CreepMemory;
}

export interface Target {
    targetType: string //one of SPAWN, CREEP, SOURCE
    targetId: string
}

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

export function makeCreepMemory(action: string, sources: Target[], destinations: Target[]): CreepMemory {
    switch (action) {
        case "HARVEST": {
            var thenPart: GiverMemory = {
                creepMemoryType: "GIVERMEMORY",
                destinations: destinations
            };
            var elsePart: WorkerMemory = {
                creepMemoryType: "WORKERMEMORY",
                action: "HARVEST",
                target: sources[0]
            };
            return <IfThenElseMemory>{
                creepMemoryType: "IFTHENELSEMEMORY",
                condition: "ISFULL",
                thenPart: thenPart,
                elsePart: elsePart
            };
        }
        case "TRANSPORT": {
            var giverMemory: GiverMemory = {
                creepMemoryType: "GIVERMEMORY",
                destinations: destinations
            };
            var takerMemory: TakerMemory = {
                creepMemoryType: "TAKERMEMORY",
                sources: sources
            };
            return <IfThenElseMemory>{
                creepMemoryType: "IFTHENELSEMEMORY",
                condition: "ISFULL",
                thenPart: giverMemory,
                elsePart: takerMemory
            };
        }
        default:
            log.error(() => "creep/makeCreepMemory: action ${action} not supported.");
            return null;
    }
}

function processCreepWithMemory(creep: Creep, creepMemory: CreepMemory) {
    switch (creepMemory.creepMemoryType.toUpperCase()) {
        case "WORKERMEMORY":
            processWorker(creep, <WorkerMemory>creepMemory);
            break;
        case "GIVERMEMORY":
            processGiver(creep, <GiverMemory>creepMemory);
            break;
        case "TAKERMEMORY":
            processTaker(creep, <TakerMemory>creepMemory);
            break;
        case "IFTHENELSEMEMORY":
            processIfThenElse(creep, <IfThenElseMemory>creepMemory);
            break;
        default:
            log.error(() => `Unexpected creepMemoryType ${creepMemory.creepMemoryType} for creep ${creep.name}.`);
            break;
    }
}

function processWorker(creep: Creep, memory: WorkerMemory) {
    if (memory.action == "HARVEST") {
        if (memory.target.targetType != "SOURCE") {
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
    switch (maxTarget.targetType) {
        case "CREEP": {
            var giver = Game.getObjectById<Creep>(maxTarget.targetId);
            if (giver == null || giver == undefined)
                return log.error(() => `creep/processGiver: could not find creep ${maxTarget.targetId}`);
            if (giver.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(giver);
            return;
        }
        default:
            return log.error(() => `creep/processTaker: targetType ${maxTarget.targetType} not supported.`);
    }
}

function getEnergy(target: Target): { energy: number, target: Target } {
    switch (target.targetType) {
        case "SOURCE": {
            var source = Game.getObjectById<Source>(target.targetId);
            return { energy: source.energy, target: target }
        }
        case "CREEP": {
            return { energy: Game.getObjectById<Creep>(target.targetId).carry.energy, target };
        }
        default: {
            log.error(() => `creep/getEnergy: Could not identify targetType ${target.targetType}.`);
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
    switch (minTarget.targetType) {
        case "CREEP": {
            var taker = Game.getObjectById<Creep>(minTarget.targetId);
            if (taker == null || taker == undefined)
                return log.error(() => `creep/processGiver: could not find creep ${minTarget.targetId}`);
            if (creep.transfer(taker, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(taker);
            return;
        }
        case "SPAWN": {
            var spawn = Game.getObjectById<Spawn>(minTarget.targetId);
            if (spawn == null || spawn === undefined)
                return log.error(() => `creep/processGiver: could not find spawn ${minTarget.targetId}`);
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(spawn);
            return;
        }
        default: {
            return log.error(() => `creep/processGiver: targetType ${minTarget.targetType} not yet supported.`);
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
    for (var idx = 0; BODYPART_COST[partsToInclude[idx]] <= energy; idx = (idx + 1) % partsToInclude.length)
        body.push(partsToInclude[idx]);
    return body;
}

export function createBodyParts(action: string, energy: number): string[] {
    switch (action) {
        case "HARVEST":
        case "UPDATE":
        case "BUILD":
            return createBodyPartsImpl([MOVE, CARRY, WORK, MOVE], energy);
        case "TRANSPORT":
            return createBodyPartsImpl([MOVE, CARRY], energy);
        default:
            log.error(() => `creep/createBodyParts: action ${action} not yet supported.`);
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}