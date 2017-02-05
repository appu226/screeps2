"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var fun = require("./functional");
var enums = require("./enums");
;
exports.eSpawn = { targetType: "Spawn" };
exports.eSource = { targetType: "Source" };
exports.eCreep = { targetType: "Creep" };
exports.eController = { targetType: "Controller" };
exports.eTower = { targetType: "Tower" };
exports.eExtension = { targetType: "Extension" };
exports.eContainer = { targetType: "Container" };
;
exports.eHarvester = { creepType: "Harvester" };
exports.eUpdater = { creepType: "Updater" };
exports.eBuilder = { creepType: "Builder" };
exports.eTransporter = { creepType: "Transporter" };
var eBuild = { action: "Build" };
var eHarvest = { action: "Harvest" };
var eUpdate = { action: "Update" };
var eIsFull = { name: "IsFull" };
var eIsEmpty = { name: "IsEmpty" };
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
function makeHarvestorMemory(sources, destinations) {
    var thenPart = {
        creepMemoryType: enums.eGiverMemory,
        destinations: destinations
    };
    if (sources.length != 1) {
        log.error(function () { return "creep/makeHarvestorMemory: Exactly one source expected, found: " + sources.length; });
        return null;
    }
    var elsePart = {
        creepMemoryType: enums.eWorkerMemory,
        action: eHarvest,
        target: sources[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsFull,
        thenPart: thenPart,
        elsePart: elsePart
    };
}
function makeTransporterMemory(sources, destinations) {
    return {
        creepMemoryType: enums.eTransporterMemory,
        sources: sources,
        destinations: destinations
    };
}
function makeUpdaterMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: enums.eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var updaterMemory = {
        creepMemoryType: enums.eWorkerMemory,
        action: eUpdate,
        target: destinations[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: updaterMemory
    };
}
function makeBuilderMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: enums.eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var builderMemory = {
        creepMemoryType: enums.eWorkerMemory,
        action: eBuild,
        target: destinations[0]
    };
    return {
        creepMemoryType: enums.eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: builderMemory
    };
}
function makeCreepMemory(creepType, sources, destinations) {
    switch (creepType.creepType) {
        case exports.eHarvester.creepType:
            return makeHarvestorMemory(sources, destinations);
        case exports.eTransporter.creepType:
            return makeTransporterMemory(sources, destinations);
        case exports.eUpdater.creepType:
            return makeUpdaterMemory(sources, destinations);
        case exports.eBuilder.creepType:
            return makeBuilderMemory(sources, destinations);
        default:
            log.error(function () { return "creep/makeCreepMemory: Creep type " + creepType.creepType + " not supported."; });
            return null;
    }
}
exports.makeCreepMemory = makeCreepMemory;
function distanceHeuristic(pos1, pos2) {
    var dx = pos1.x - pos2.x;
    var dy = pos1.y - pos2.y;
    return Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20);
}
function resetContainerEnergy(te, hardCodedContainerEnergy) {
    if (te.target.targetType != exports.eContainer)
        return te.energy;
    else {
        var container = Game.getObjectById(te.target.targetId);
        return te.energy / hardCodedContainerEnergy * (container.store / container.storeCapacity);
    }
}
function processTransporterMemory(creep, transporterMemory) {
    var maxSourceEnergy = fun.maxBy(transporterMemory.sources.map(function (source) { return getEnergy(source, .0000001); }), function (e) {
        return e.energy
            / distanceHeuristic(creep.pos, Game.getObjectById(e.target.targetId).pos);
    });
    var minDestinationEnergy = fun.maxBy(transporterMemory.destinations.map(function (destination) { return getEnergy(destination, .9999999); }), function (e) {
        return (1 - e.energy)
            / distanceHeuristic(creep.pos, Game.getObjectById(e.target.targetId).pos);
    }).map(function (teIn) {
        return { energy: (1 - teIn.energy), target: teIn.target };
    });
    if (!maxSourceEnergy.isPresent && !minDestinationEnergy.isPresent) {
        log.error(function () {
            return "creep/processTransporterMemory: creep " + creep.name + " has "
                + (transporterMemory.sources.length + " sources and ")
                + (transporterMemory.destinations.length + " destinations.");
        });
    }
    else if (!maxSourceEnergy.isPresent) {
        return give(creep, minDestinationEnergy.get.target);
    }
    else if (!minDestinationEnergy.isPresent) {
        return take(creep, maxSourceEnergy.get.target);
    }
    else {
        var takeAppeal = resetContainerEnergy(maxSourceEnergy.get, .0000001) * (1 - creep.carry.energy / creep.carryCapacity);
        var giveAppeal = resetContainerEnergy(minDestinationEnergy.get, .9999999) * creep.carry.energy / creep.carryCapacity;
        console.log("creep " + creep.name + " has appeals " + takeAppeal + " " + giveAppeal);
        if (takeAppeal > giveAppeal || giveAppeal == 0) {
            return take(creep, maxSourceEnergy.get.target);
        }
        else {
            return give(creep, minDestinationEnergy.get.target);
        }
    }
}
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
        case enums.eTransporterMemory.name:
            processTransporterMemory(creep, creepMemory);
            break;
        default:
            log.error(function () { return "Unexpected creepMemoryType " + creepMemory.creepMemoryType.name + " for creep " + creep.name + "."; });
            break;
    }
}
function processWorker(creep, memory) {
    if (memory.action.action == eHarvest.action) {
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
    else if (memory.action.action == eUpdate.action) {
        if (memory.target.targetType.targetType != exports.eController.targetType) {
            return log.error(function () { return "creep/processWorker: action " + memory.action.action + " used with targetType " + memory.target.targetType.targetType; });
        }
        var controller = Game.getObjectById(memory.target.targetId);
        if (controller == null || controller === undefined) {
            return log.error(function () { return "creep/processWorker: action " + memory.action.action + " could not find controller with id " + memory.target.targetId; });
        }
        var dx = creep.pos.x - controller.pos.x, dy = creep.pos.y - controller.pos.y;
        if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE || (dx * dx + dy * dy > 8)) {
            creep.moveTo(controller);
        }
        return;
    }
    else if (memory.action.action == eBuild.action) {
        var site = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);
        if (site !== undefined && site != null
            && site.progress !== undefined && site.progressTotal !== undefined
            && site.progress < site.progressTotal) {
            if (creep.build(site) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site);
            }
            return;
        }
        var structures = creep.room.find(FIND_STRUCTURES).filter(function (s) { return s.structureType != STRUCTURE_CONTROLLER; });
        var weakestStructure = fun.maxBy(structures, function (s) {
            var dx = s.pos.x - creep.pos.x;
            var dy = s.pos.y - creep.pos.y;
            var res = (Math.min(s.hitsMax, 100000) / s.hits) / (Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20));
            return res;
        });
        if (weakestStructure.isPresent) {
            var structure = weakestStructure.get;
            log.debug(function () { return "repairing structure " + structure.structureType; });
            if (creep.repair(structure) == ERR_NOT_IN_RANGE)
                creep.moveTo(structure);
        }
        ;
        return;
    }
    else {
        return log.error(function () { return "creep/processWorker: unexpected action " + memory.action.action + "."; });
    }
}
function take(creep, maxTarget) {
    switch (maxTarget.targetType.targetType) {
        case exports.eCreep.targetType: {
            var giver = Game.getObjectById(maxTarget.targetId);
            if (giver == null || giver == undefined)
                return log.error(function () { return "creep/take: could not find creep " + maxTarget.targetId; });
            if (giver.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(giver);
            return;
        }
        case exports.eContainer.targetType: {
            var container = Game.getObjectById(maxTarget.targetId);
            if (container == null || container == undefined)
                return log.error(function () { return "creep/take: could not find container " + maxTarget.targetId; });
            if (container.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(container);
            return;
        }
        default:
            return log.error(function () { return "creep/take: targetType " + maxTarget.targetType.targetType + " not supported."; });
    }
}
function processTaker(creep, memory) {
    var energies = memory.sources.map(function (t) { return getEnergy(t, .0000000001); });
    var maxEnergy = fun.maxBy(energies, (function (x) { return x.energy; }));
    if (!maxEnergy.isPresent) {
        return log.error(function () { return "creep/processGiver: creep " + creep.name + " has only " + memory.sources.length + " destinations"; });
    }
    var maxTarget = maxEnergy.get.target;
    return take(creep, maxTarget);
}
function getEnergy(target, containerEnergy) {
    switch (target.targetType.targetType) {
        case exports.eTower.targetType:
        case exports.eSpawn.targetType:
        case exports.eExtension.targetType:
        case exports.eSource.targetType: {
            var source = Game.getObjectById(target.targetId);
            return { energy: source.energy / source.energyCapacity, target: target };
        }
        case exports.eContainer.targetType: {
            var container = Game.getObjectById(target.targetId);
            return { energy: containerEnergy, target: target }; // fill containers after everything else is full
        }
        case exports.eCreep.targetType: {
            var creep = Game.getObjectById(target.targetId);
            return { energy: creep.carry.energy / creep.carryCapacity, target: target };
        }
        case exports.eController.targetType: {
            var controller = Game.getObjectById(target.targetId);
            return { energy: controller.progress / controller.progressTotal, target: target };
        }
        default: {
            log.error(function () { return "creep/getEnergy: Could not identify targetType " + target.targetType.targetType + "."; });
            return { energy: 0, target: target };
        }
    }
}
function give(creep, minTarget) {
    switch (minTarget.targetType.targetType) {
        case exports.eCreep.targetType: {
            var taker = Game.getObjectById(minTarget.targetId);
            if (taker == null || taker == undefined)
                return log.error(function () { return "creep/give: could not find creep " + minTarget.targetId; });
            if (creep.transfer(taker, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(taker);
            return;
        }
        case exports.eSpawn.targetType:
        case exports.eTower.targetType:
        case exports.eExtension.targetType:
        case exports.eContainer.targetType: {
            var spawn = Game.getObjectById(minTarget.targetId);
            if (spawn == null || spawn === undefined)
                return log.error(function () { return "creep/give: could not find spawn " + minTarget.targetId; });
            if (creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(spawn);
            return;
        }
        case exports.eController.targetType: {
            if (creep.getActiveBodyparts(WORK) > 0) {
                var controller = Game.getObjectById(minTarget.targetId);
                if (controller == null || controller === undefined) {
                    return log.error(function () { return "creep/give: Creep " + creep.name + " could not find controller " + controller.id; });
                }
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller);
                }
                return;
            }
            log.error(function () { return "creep/give: Creep " + creep.name + " does not have WORK parts to upgrade controller " + minTarget.targetId; });
            return;
        }
        default: {
            return log.error(function () { return "creep/give: targetType " + minTarget.targetType.targetType + " not yet supported."; });
        }
    }
}
function processGiver(creep, memory) {
    var energies = memory.destinations.map(function (t) { return getEnergy(t, .999999999); });
    var minEnergy = fun.maxBy(energies, (function (x) { return x.energy * -1; }));
    if (!minEnergy.isPresent) {
        return log.error(function () { return "creep/processGiver: creep " + creep.name + " has only " + memory.destinations.length + " destinations"; });
    }
    var minTarget = minEnergy.get.target;
    return give(creep, minTarget);
}
function processIfThenElse(creep, memory) {
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
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, MOVE, MOVE], energy);
        case exports.eTransporter.creepType:
            return createBodyPartsImpl([MOVE, CARRY], energy);
        default:
            log.error(function () { return "creep/createBodyParts: Creep type " + creepType.creepType + " not yet supported."; });
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}
exports.createBodyParts = createBodyParts;
