"use strict";
var memoryUtils = require("./memory");
var mapUtils = require("./map");
var log = require("./log");
var fun = require("./functional");
var eGiverMemory = { name: "GiverMemory" };
var eWorkerMemory = { name: "WorkerMemory" };
var eIfThenElseMemory = { name: "IfThenElseMemory" };
var eTakerMemory = { name: "TakerMemory" };
var eTransporterMemory = { name: "TransporterMemory" };
var eClaimerMemory = { name: "ClaimerMemory" };
var eSpawnBuilderMemory = { name: "SpawnBuilderMemory" };
var eActiveNinjaMemory = { name: "ActiveNinjaMemory" };
var eRegroupingNinjaMemory = { name: "RegroupingNinjaMemory" };
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
exports.eClaimer = { creepType: "Claimer" };
exports.eSpawnBuilder = { creepType: "SpawnBuilder" };
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
function dummyPrevPos() {
    return {
        x: 0,
        y: 0,
        roomName: ""
    };
}
function makeHarvestorMemory(sources, destinations) {
    var thenPart = {
        creepMemoryType: eGiverMemory,
        destinations: destinations,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    if (sources.length != 1) {
        log.error(function () { return "creep/makeHarvestorMemory: Exactly one source expected, found: " + sources.length; });
        return null;
    }
    var elsePart = {
        creepMemoryType: eWorkerMemory,
        action: eHarvest,
        target: sources[0],
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsFull,
        thenPart: thenPart,
        elsePart: elsePart,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeTransporterMemory(sources, destinations) {
    return {
        creepMemoryType: eTransporterMemory,
        sources: sources,
        destinations: destinations,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeSpawnBuilderMemory(constructionSite) {
    return {
        creepMemoryType: eSpawnBuilderMemory,
        constructionSiteId: constructionSite.id,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeClaimerMemory(roomName) {
    return {
        creepMemoryType: eClaimerMemory,
        roomName: roomName,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeUpdaterMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var updaterMemory = {
        creepMemoryType: eWorkerMemory,
        action: eUpdate,
        target: destinations[0],
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: updaterMemory,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeBuilderMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var builderMemory = {
        creepMemoryType: eWorkerMemory,
        action: eBuild,
        target: destinations[0],
        prevPos: dummyPrevPos(),
        stuck: 0
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: builderMemory,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
function makeActiveNinjaMemory(roomName) {
    return {
        creepMemoryType: eActiveNinjaMemory,
        roomName: roomName,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
exports.makeActiveNinjaMemory = makeActiveNinjaMemory;
function makeRegroupingNinjaMemory(regroupingPos) {
    return {
        creepMemoryType: eRegroupingNinjaMemory,
        regroupingPos: regroupingPos,
        prevPos: dummyPrevPos(),
        stuck: 0
    };
}
exports.makeRegroupingNinjaMemory = makeRegroupingNinjaMemory;
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
        var ret = (1 - e.energy)
            / distanceHeuristic(creep.pos, Game.getObjectById(e.target.targetId).pos);
        return ret;
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
        log.debug(function () { return "creep " + creep.name + " has appeals " + takeAppeal + " " + giveAppeal; });
        if (takeAppeal > giveAppeal || (giveAppeal == takeAppeal && creep.carry.energy < creep.carryCapacity / 2)) {
            return take(creep, maxSourceEnergy.get.target);
        }
        else {
            return give(creep, minDestinationEnergy.get.target);
        }
    }
}
var dirs = [];
function randomDirection() {
    if (dirs.length == 0)
        dirs = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    return dirs[Math.floor(Math.random() * 16) % 8];
}
function move(creep, pos) {
    var mem = creep.memory;
    updateStuckCount(creep);
    if (mem.stuck > 5) {
        var thePath = creep.pos.findPathTo(pos, { ignoreCreeps: true });
        if (thePath.length > 0) {
            var nextPos = thePath[0];
            creep.room.lookForAt(LOOK_CREEPS, nextPos.x, nextPos.y).forEach(function (obstacle) {
                log.debug(function () { return "creep/move: Creep " + creep.name + " is trying to move obstacle " + obstacle.name; });
                obstacle.move(randomDirection());
            });
        }
    }
    return creep.moveTo(pos, {
        reusePath: memoryUtils.enrichedMemory().pathReuse.reusePath,
        ignoreCreeps: (mem.stuck <= 2)
    });
}
function moveToRoom(creep, roomName) {
    var exitDir = Game.map.findExit(creep.room, roomName);
    if (exitDir == ERR_INVALID_ARGS)
        return log.error(function () { return "creep/moveToRoom: findExit(" + creep.room.name + ", " + roomName + ") gave ERR_INVALID_ARGS for creep " + creep.name + "."; });
    else if (exitDir == ERR_NO_PATH)
        return log.error(function () { return "creep/moveToRoom: findExit(" + creep.room.name + ", " + roomName + ") gave ERR_NO_PATH for creep " + creep.name + "."; });
    else {
        var exit = creep.pos.findClosestByRange(exitDir);
        return move(creep, exit);
    }
}
function processClaimerMemory(creep, claimerMemory) {
    if (creep.room.name != claimerMemory.roomName) {
        return moveToRoom(creep, claimerMemory.roomName);
    }
    var controller = creep.room.controller;
    if (creep.claimController(controller) == ERR_NOT_IN_RANGE)
        move(creep, controller);
}
function processSpawnBuilderMemory(creep, spawnBuilderMemory) {
    var constructionSite = Game.getObjectById(spawnBuilderMemory.constructionSiteId);
    if (constructionSite == null || constructionSite === undefined) {
        return log.error(function () { return "creep/processSpawnBuilderMemory: " + creep.name + " could not find construction site with id " + spawnBuilderMemory.constructionSiteId; });
    }
    else if (creep.room.name !== constructionSite.room.name) {
        return moveToRoom(creep, constructionSite.room.name);
    }
    else {
        var buildAppeal = creep.carry.energy / creep.carryCapacity / distanceHeuristic(creep.pos, constructionSite.pos);
        var closestSource = creep.pos.findClosestByPath(FIND_SOURCES);
        if (closestSource == null || closestSource === undefined) {
            return log.error(function () { return "creep/processSpawnBuilderMemory: creep " + creep.name + " could not find a source to harvest."; });
        }
        var refillAppeal = (1 - creep.carry.energy / creep.carryCapacity) / distanceHeuristic(creep.pos, closestSource.pos);
        if (buildAppeal > refillAppeal) {
            if (creep.build(constructionSite) == ERR_NOT_IN_RANGE) {
                move(creep, constructionSite);
            }
            return;
        }
        else {
            if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                move(creep, closestSource);
            }
            return;
        }
    }
}
function ninjaHeal(creep, anm, canHeal, canRangeHeal, canMove) {
    var patients = mapUtils.patients(anm.roomName).filter(function (creep) { return creep.hits < creep.hitsMax; });
    var closestOpt = fun.maxBy(patients, function (patient) { return mapUtils.manhattan(creep.pos.x, creep.pos.y, patient.pos.x, patient.pos.y); });
    if (closestOpt.isPresent) {
        var closest = closestOpt.get;
        var distance = mapUtils.manhattan(creep.pos.x, creep.pos.y, closest.pos.x, closest.pos.y);
        if (distance > 4) {
            if (canMove)
                move(creep, closest);
            return;
        }
        else if (distance > 1) {
            if (canMove)
                move(creep, closest);
            if (canRangeHeal)
                creep.rangedHeal(closest);
            return;
        }
        else {
            if (canHeal)
                creep.heal(closest);
            else if (canRangeHeal)
                creep.rangedHeal(closest);
            return;
        }
    }
    else {
        return;
    }
}
function processActiveNinjaMemory(creep, anm) {
    if (creep.room.name != anm.roomName) {
        return moveToRoom(creep, anm.roomName);
    }
    var attackers = mapUtils.foreignAttackers(anm.roomName);
    var closestOpt = fun.maxBy(attackers, function (attacker) { return mapUtils.manhattan(creep.pos.x, creep.pos.y, attacker.pos.x, attacker.pos.y) * -1; });
    if (!closestOpt.isPresent) {
        return ninjaHeal(creep, anm, true, true, true);
    }
    else {
        var closest = closestOpt.get;
        var distance = mapUtils.manhattan(creep.pos.x, creep.pos.y, closest.pos.x, closest.pos.y);
        if (distance > 4) {
            move(creep, closest);
            return ninjaHeal(creep, anm, true, true, false);
        }
        else if (distance > 1) {
            creep.rangedAttack(closest);
            move(creep, closest);
            return ninjaHeal(creep, anm, true, false, false);
        }
        else {
            creep.attack(closest);
            return ninjaHeal(creep, anm, false, true, false);
        }
    }
}
function processRegroupingNinjaMemory(creep, rnm) {
    if (mapUtils.manhattan(creep.pos.x, creep.pos.y, rnm.regroupingPos.x, rnm.regroupingPos.y) > 2) {
        var pos = new RoomPosition(rnm.regroupingPos.x, rnm.regroupingPos.y, creep.room.name);
        move(creep, pos);
    }
}
function processCreepWithMemory(creep, creepMemory) {
    switch (creepMemory.creepMemoryType.name) {
        case eWorkerMemory.name:
            processWorker(creep, creepMemory);
            break;
        case eGiverMemory.name:
            processGiver(creep, creepMemory);
            break;
        case eTakerMemory.name:
            processTaker(creep, creepMemory);
            break;
        case eIfThenElseMemory.name:
            processIfThenElse(creep, creepMemory);
            break;
        case eTransporterMemory.name:
            processTransporterMemory(creep, creepMemory);
            break;
        case eClaimerMemory.name:
            processClaimerMemory(creep, creepMemory);
            break;
        case eSpawnBuilderMemory.name:
            processSpawnBuilderMemory(creep, creepMemory);
            break;
        case eActiveNinjaMemory.name:
            processActiveNinjaMemory(creep, creepMemory);
            break;
        case eRegroupingNinjaMemory.name:
            processRegroupingNinjaMemory(creep, creepMemory);
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
            move(creep, source);
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
            move(creep, controller);
        }
        return;
    }
    else if (memory.action.action == eBuild.action) {
        var site = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);
        if (site !== undefined && site != null
            && site.progress !== undefined && site.progressTotal !== undefined
            && site.progress < site.progressTotal) {
            if (creep.build(site) == ERR_NOT_IN_RANGE) {
                move(creep, site);
            }
            return;
        }
        var noTowers = creep.room.find(FIND_MY_STRUCTURES).filter(function (struct) { return struct.structureType == STRUCTURE_TOWER; }).length == 0;
        if (noTowers) {
            // if the room does not have any towers, then repair structures
            var weakestStructure = fun.maxBy(creep.room.find(FIND_STRUCTURES).filter(function (s) {
                return s.structureType != STRUCTURE_CONTROLLER
                    && (s.my === undefined
                        || s.my == true);
            }), function (s) { return s.hits * -1; });
            if (weakestStructure.isPresent) {
                if (creep.repair(weakestStructure.get) == ERR_NOT_IN_RANGE)
                    move(creep, weakestStructure.get);
                return;
            }
        }
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
                move(creep, giver);
            return;
        }
        case exports.eContainer.targetType: {
            var container = Game.getObjectById(maxTarget.targetId);
            if (container == null || container == undefined)
                return log.error(function () { return "creep/take: could not find container " + maxTarget.targetId; });
            if (container.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                move(creep, container);
            return;
        }
        default:
            return log.error(function () { return "creep/take: targetType " + maxTarget.targetType.targetType + " not supported for creep " + creep.name + "."; });
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
            return { energy: containerEnergy, target: target }; // fill/deplete containers after everything else is full/empty
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
                move(creep, taker);
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
                move(creep, spawn);
            return;
        }
        case exports.eController.targetType: {
            if (creep.getActiveBodyparts(WORK) > 0) {
                var controller = Game.getObjectById(minTarget.targetId);
                if (controller == null || controller === undefined) {
                    return log.error(function () { return "creep/give: Creep " + creep.name + " could not find controller " + controller.id; });
                }
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    move(creep, controller);
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
function createBodyPartsImpl(partsToInclude, energy, repeat) {
    if (repeat === void 0) { repeat = true; }
    if (!repeat)
        energy = Math.min(energy, fun.sum(partsToInclude.map(function (part) { return BODYPART_COST[part]; })));
    var body = [];
    for (var idx = 0; BODYPART_COST[partsToInclude[idx]] <= energy; idx = (idx + 1) % partsToInclude.length) {
        energy = energy - BODYPART_COST[partsToInclude[idx]];
        body.push(partsToInclude[idx]);
    }
    return body;
}
exports.createBodyPartsImpl = createBodyPartsImpl;
function createBodyParts(creepType, energy) {
    if (energy < 300) {
        log.error(function () { return "creep/createBodyParts: expected at least 300 energy, got: " + energy; });
        return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
    switch (creepType.creepType) {
        case exports.eHarvester.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, CARRY, WORK, WORK, WORK, CARRY], energy, false);
        case exports.eBuilder.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, CARRY, CARRY, CARRY], energy, false);
        case exports.eUpdater.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, WORK, CARRY, WORK, WORK, WORK, CARRY, WORK, WORK, WORK, WORK], energy, false);
        case exports.eTransporter.creepType:
            return createBodyPartsImpl([MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY, MOVE, CARRY], energy, false);
        case exports.eClaimer.creepType: {
            if (energy < 650)
                log.error(function () { return "creep/createBodyParts: cannot create claimer without at least 650 energy, got : " + energy; });
            return createBodyPartsImpl([MOVE, CLAIM, CLAIM], Math.min(energy, BODYPART_COST[MOVE] + 2 * BODYPART_COST[CLAIM]));
        }
        case exports.eSpawnBuilder.creepType: {
            return createBodyPartsImpl([MOVE, CARRY, MOVE, WORK], energy);
        }
        default:
            log.error(function () { return "creep/createBodyParts: Creep type " + creepType.creepType + " not yet supported."; });
            return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
}
exports.createBodyParts = createBodyParts;
function spawnClaimer(spawn, roomName) {
    var memory = makeClaimerMemory(roomName);
    var body = createBodyParts(exports.eClaimer, spawn.room.energyAvailable);
    var name = "Claimer" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);
}
exports.spawnClaimer = spawnClaimer;
function spawnSpawnBuilder(spawn, constructionSite) {
    var memory = makeSpawnBuilderMemory(constructionSite);
    var body = createBodyParts(exports.eSpawnBuilder, spawn.room.energyAvailable);
    var name = "SpawnBuilder" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);
}
exports.spawnSpawnBuilder = spawnSpawnBuilder;
function spawnActiveNinja(spawn, roomName) {
    var memory = makeActiveNinjaMemory(roomName);
    var body = createBodyPartsImpl([MOVE, HEAL, MOVE, ATTACK, MOVE, RANGED_ATTACK, MOVE, TOUGH], spawn.room.energyAvailable);
    var name = "Ninja" + memoryUtils.getUid();
    return spawn.createCreep(body, name, memory);
}
exports.spawnActiveNinja = spawnActiveNinja;
function updateStuckCount(creep) {
    var mem = creep.memory;
    if (mem.prevPos === undefined || mem.prevPos == null) {
        mem.prevPos = { x: creep.pos.x, y: creep.pos.y, roomName: creep.pos.roomName };
    }
    if (mem.stuck === undefined || mem.stuck == null) {
        mem.stuck = 0;
    }
    if (mem.prevPos.x == creep.pos.x && mem.prevPos.y == creep.pos.y && mem.prevPos.roomName == creep.pos.roomName) {
        mem.stuck = mem.stuck + 1;
    }
    else {
        mem.stuck = 0;
        mem.prevPos.x = creep.pos.x;
        mem.prevPos.y = creep.pos.y;
        mem.prevPos.roomName = creep.pos.roomName;
    }
}
