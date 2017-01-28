"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var fun = require("./functional");
var enums = require("./enums");
;
exports.eSpawn = { targetType: "Spawn" };
exports.eSource = { targetType: "Source" };
exports.eCreep = { targetType: "Creep" };
;
exports.eHarvester = { creepType: "Harvester" };
exports.eUpdater = { creepType: "Updater" };
exports.eBuilder = { creepType: "Builder" };
exports.eTransporter = { creepType: "Transporter" };
function process(creep) {
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
exports.process = process;
function makeCreepMemory(creepType, sources, destinations) {
    switch (creepType.creepType) {
        case exports.eHarvester.creepType: {
            var thenPart = {
                creepMemoryType: enums.eGiverMemory,
                destinations: destinations
            };
            var elsePart = {
                creepMemoryType: enums.eWorkerMemory,
                action: "HARVEST",
                target: sources[0]
            };
            return {
                creepMemoryType: enums.eIfThenElseMemory,
                condition: "ISFULL",
                thenPart: thenPart,
                elsePart: elsePart
            };
        }
        case exports.eTransporter.creepType: {
            var giverMemory = {
                creepMemoryType: enums.eGiverMemory,
                destinations: destinations
            };
            var takerMemory = {
                creepMemoryType: enums.eTakerMemory,
                sources: sources
            };
            return {
                creepMemoryType: enums.eIfThenElseMemory,
                condition: "ISFULL",
                thenPart: giverMemory,
                elsePart: takerMemory
            };
        }
        default:
            log.error(function () { return "creep/makeCreepMemory: Creep type " + creepType.creepType + " not supported."; });
            return null;
    }
}
exports.makeCreepMemory = makeCreepMemory;
function processCreepWithMemory(creep, creepMemory) {
    switch (creepMemory.creepMemoryType.name) {
        case enums.eWorkerMemory.name:
            processWorker(creep, creepMemory);
            break;
        case enums.eGiverMemory.name:
            processGiver(creep, creepMemory);
            break;
        case enums.eTakerMemory.name:
            processTaker(creep, creepMemory);
            break;
        case enums.eIfThenElseMemory.name:
            processIfThenElse(creep, creepMemory);
            break;
        default:
            log.error(function () { return "Unexpected creepMemoryType " + creepMemory.creepMemoryType.name + " for creep " + creep.name + "."; });
            break;
    }
}
function processWorker(creep, memory) {
    if (memory.action == "HARVEST") {
        if (memory.target.targetType.targetType != exports.eSource.targetType) {
            return log.error(function () { return "creep/processWorker: action HARVEST used with targetType" + memory.target.targetType; });
        }
        var source = Game.getObjectById(memory.target.targetId);
        if (source == null || source === undefined) {
            return log.error(function () { return "creep/processWorker: action HARVEST could not find source id " + memory.target.targetId; });
        }
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source);
        }
        return;
    }
    else {
        return log.error(function () { return "creep/processWorker: unexpected action " + memory.action + "."; });
    }
}
function processTaker(creep, memory) {
    var energies = memory.sources.map(getEnergy);
    var maxEnergy = fun.maxBy(energies, (function (x) { return x.energy; }));
    if (!maxEnergy.isPresent) {
        return log.error(function () { return "creep/processGiver: creep " + creep.name + " has only " + memory.sources.length + " destinations"; });
    }
    var maxTarget = maxEnergy.get.target;
    switch (maxTarget.targetType.targetType) {
        case exports.eCreep.targetType: {
            var giver = Game.getObjectById(maxTarget.targetId);
            if (giver == null || giver == undefined)
                return log.error(function () { return "creep/processGiver: could not find creep " + maxTarget.targetId; });
            if (giver.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(giver);
            return;
        }
        default:
            return log.error(function () { return "creep/processTaker: targetType " + maxTarget.targetType.targetType + " not supported."; });
    }
}
function getEnergy(target) {
    switch (target.targetType.targetType) {
        case exports.eSource.targetType: {
            var source = Game.getObjectById(target.targetId);
            return { energy: source.energy, target: target };
        }
        case exports.eCreep.targetType: {
            return { energy: Game.getObjectById(target.targetId).carry.energy, target: target };
        }
        case exports.eSpawn.targetType: {
            return { energy: Game.getObjectById(target.targetId).energy, target: target };
        }
        default: {
            log.error(function () { return "creep/getEnergy: Could not identify targetType " + target.targetType.targetType + "."; });
            return { energy: 0, target: target };
        }
    }
}
function processGiver(creep, memory) {
    var energies = memory.destinations.map(getEnergy);
    var minEnergy = fun.maxBy(energies, (function (x) { return x.energy * -1; }));
    if (!minEnergy.isPresent) {
        return log.error(function () { return "creep/processGiver: creep " + creep.name + " has only " + memory.destinations.length + " destinations"; });
    }
    var minTarget = minEnergy.get.target;
    switch (minTarget.targetType.targetType) {
        case exports.eCreep.targetType: {
            var taker = Game.getObjectById(minTarget.targetId);
            if (taker == null || taker == undefined)
                return log.error(function () { return "creep/processGiver: could not find creep " + minTarget.targetId; });
            if (creep.transfer(taker, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(taker);
            return;
        }
        case exports.eSpawn.targetType: {
            var spawn = Game.getObjectById(minTarget.targetId);
            if (spawn == null || spawn === undefined)
                return log.error(function () { return "creep/processGiver: could not find spawn " + minTarget.targetId; });
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(spawn);
            return;
        }
        default: {
            return log.error(function () { return "creep/processGiver: targetType " + minTarget.targetType.targetType + " not yet supported."; });
        }
    }
}
function processIfThenElse(creep, memory) {
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
            return log.error(function () { return "creep/processIfThenElse: condition " + memory.condition + " not yet supported."; });
    }
}
function createBodyPartsImpl(partsToInclude, energy) {
    var body = [];
    for (var idx = 0; BODYPART_COST[partsToInclude[idx]] <= energy; idx = (idx + 1) % partsToInclude.length) {
        energy = energy - BODYPART_COST[partsToInclude[idx]];
        body.push(partsToInclude[idx]);
    }
    return body;
}
function createBodyParts(creepType, energy) {
    switch (creepType.creepType) {
        case exports.eHarvester.creepType:
        case exports.eUpdater.creepType:
        case exports.eBuilder.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, MOVE], energy);
        case exports.eTransporter.creepType:
            return createBodyPartsImpl([MOVE, CARRY], energy);
        default:
            log.error(function () { return "creep/createBodyParts: Creep type " + creepType.creepType + " not yet supported."; });
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}
exports.createBodyParts = createBodyParts;
