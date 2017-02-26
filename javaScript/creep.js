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
function makeHarvestorMemory(sources, destinations) {
    var thenPart = {
        creepMemoryType: eGiverMemory,
        destinations: destinations
    };
    if (sources.length != 1) {
        log.error(function () { return "creep/makeHarvestorMemory: Exactly one source expected, found: " + sources.length; });
        return null;
    }
    var elsePart = {
        creepMemoryType: eWorkerMemory,
        action: eHarvest,
        target: sources[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsFull,
        thenPart: thenPart,
        elsePart: elsePart
    };
}
function makeTransporterMemory(sources, destinations) {
    return {
        creepMemoryType: eTransporterMemory,
        sources: sources,
        destinations: destinations
    };
}
function makeSpawnBuilderMemory(constructionSite) {
    return {
        creepMemoryType: eSpawnBuilderMemory,
        constructionSiteId: constructionSite.id
    };
}
function makeClaimerMemory(roomName) {
    return {
        creepMemoryType: eClaimerMemory,
        roomName: roomName
    };
}
function makeUpdaterMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var updaterMemory = {
        creepMemoryType: eWorkerMemory,
        action: eUpdate,
        target: destinations[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: updaterMemory
    };
}
function makeBuilderMemory(sources, destinations) {
    var takerMemory = {
        creepMemoryType: eTakerMemory,
        sources: sources
    };
    if (destinations.length != 1) {
        log.error(function () { return "creep/makeUpdaterMemory: Exactly one destination expected, found " + destinations.length; });
        return null;
    }
    var builderMemory = {
        creepMemoryType: eWorkerMemory,
        action: eBuild,
        target: destinations[0]
    };
    return {
        creepMemoryType: eIfThenElseMemory,
        condition: eIsEmpty,
        thenPart: takerMemory,
        elsePart: builderMemory
    };
}
function makeActiveNinjaMemory(roomName) {
    return {
        creepMemoryType: eActiveNinjaMemory,
        roomName: roomName
    };
}
exports.makeActiveNinjaMemory = makeActiveNinjaMemory;
function makeRegroupingNinjaMemory(regroupingPos) {
    return {
        creepMemoryType: eRegroupingNinjaMemory,
        regroupingPos: regroupingPos
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
function moveToRoom(creep, roomName) {
    var exitDir = Game.map.findExit(creep.room, roomName);
    if (exitDir == ERR_INVALID_ARGS)
        return log.error(function () { return "creep/moveToRoom: findExit(" + creep.room.name + ", " + roomName + ") gave ERR_INVALID_ARGS for creep " + creep.name + "."; });
    else if (exitDir == ERR_NO_PATH)
        return log.error(function () { return "creep/moveToRoom: findExit(" + creep.room.name + ", " + roomName + ") gave ERR_NO_PATH for creep " + creep.name + "."; });
    else {
        var exit = creep.pos.findClosestByRange(exitDir);
        return creep.moveTo(exit, memoryUtils.enrichedMemory().pathReuse);
    }
}
function processClaimerMemory(creep, claimerMemory) {
    if (creep.room.name != claimerMemory.roomName) {
        return moveToRoom(creep, claimerMemory.roomName);
    }
    var controller = creep.room.controller;
    if (creep.claimController(controller) == ERR_NOT_IN_RANGE)
        creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(constructionSite, memoryUtils.enrichedMemory().pathReuse);
            }
            return;
        }
        else {
            if (creep.harvest(closestSource) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestSource, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        else if (distance > 1) {
            if (canMove)
                creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
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
            creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return ninjaHeal(creep, anm, true, true, false);
        }
        else if (distance > 1) {
            creep.rangedAttack(closest);
            creep.moveTo(closest, memoryUtils.enrichedMemory().pathReuse);
            return ninjaHeal(creep, anm, true, false, false);
        }
        else {
            creep.attack(closest);
            return ninjaHeal(creep, anm, false, true, false);
        }
    }
}
function processRegroupingNinjaMemory(creep, rnm) {
    if (mapUtils.manhattan(creep.pos.x, creep.pos.y, rnm.regroupingPos.x, rnm.regroupingPos.y) > 5)
        creep.moveTo(rnm.regroupingPos.x, rnm.regroupingPos.y, memoryUtils.enrichedMemory().pathReuse);
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
            creep.moveTo(source, memoryUtils.enrichedMemory().pathReuse);
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
            creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
        }
        return;
    }
    else if (memory.action.action == eBuild.action) {
        var site = creep.pos.findClosestByRange(FIND_MY_CONSTRUCTION_SITES);
        if (site !== undefined && site != null
            && site.progress !== undefined && site.progressTotal !== undefined
            && site.progress < site.progressTotal) {
            if (creep.build(site) == ERR_NOT_IN_RANGE) {
                creep.moveTo(site, memoryUtils.enrichedMemory().pathReuse);
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
                    creep.moveTo(weakestStructure.get, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(giver, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        case exports.eContainer.targetType: {
            var container = Game.getObjectById(maxTarget.targetId);
            if (container == null || container == undefined)
                return log.error(function () { return "creep/take: could not find container " + maxTarget.targetId; });
            if (container.transfer(creep, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE)
                creep.moveTo(container, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(taker, memoryUtils.enrichedMemory().pathReuse);
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
                creep.moveTo(spawn, memoryUtils.enrichedMemory().pathReuse);
            return;
        }
        case exports.eController.targetType: {
            if (creep.getActiveBodyparts(WORK) > 0) {
                var controller = Game.getObjectById(minTarget.targetId);
                if (controller == null || controller === undefined) {
                    return log.error(function () { return "creep/give: Creep " + creep.name + " could not find controller " + controller.id; });
                }
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, memoryUtils.enrichedMemory().pathReuse);
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
exports.createBodyPartsImpl = createBodyPartsImpl;
function createBodyParts(creepType, energy) {
    if (energy < 300) {
        log.error(function () { return "creep/createBodyParts: expected at least 300 energy, got: " + energy; });
        return createBodyPartsImpl(BODYPARTS_ALL, energy);
    }
    switch (creepType.creepType) {
        case exports.eHarvester.creepType:
        case exports.eBuilder.creepType:
            return [MOVE, CARRY, WORK, WORK];
        case exports.eUpdater.creepType:
            return createBodyPartsImpl([MOVE, CARRY, WORK, WORK, WORK, WORK], Math.min(energy, 500));
        case exports.eTransporter.creepType:
            return [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY];
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
