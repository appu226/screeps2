"use strict";
var memoryUtils = require("./memory");
var chainUtils = require("./chain");
var functional = require("./functional");
var log = require("./log");
var enums = require("./enums");
var sqdrn = require("./squadron");
function processSpawn(spawn) {
    var disabledCollection = (functional.sum(spawn.room.find(FIND_SOURCES_ACTIVE).map(function (source) { return memoryUtils.sourceMemory(source).energyCollection.total; })) < 60);
    if (spawn.room.energyAvailable < (disabledCollection ? 300 : spawn.room.energyCapacityAvailable)
        || spawn.spawning != null)
        return;
    var groups = memoryUtils.enrichedMemory().creepGroups;
    if (groups.length == 0) {
        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];
            var source = spawn.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
            if (spawn == null || spawn === undefined)
                return log.error(function () { return "Could not find spawn with name " + spawnName; });
            if (source == null || source === undefined)
                return log.error(function () { return "Could not find closest source to spawn with name " + spawnName; });
            memoryUtils.enrichedMemory().creepGroups.push(chainUtils.createSourceToSpawnChain(source.id, spawn.id));
        }
        groups = memoryUtils.enrichedMemory().creepGroups;
    }
    var creepToBeSpawned = functional.None();
    for (var groupNum = 0; groupNum < groups.length && !creepToBeSpawned.isPresent; ++groupNum) {
        var group = groups[groupNum];
        if (group.spawnId != spawn.id)
            continue;
        switch (group.creepGroupType.name) {
            case enums.eChain.name: {
                var chain = group;
                creepToBeSpawned = chainUtils.creepToBeSpawned(chain, spawn.room.energyAvailable);
                break;
            }
            case enums.eSquadron.name: {
                var squadron = group;
                creepToBeSpawned = sqdrn.creepToBeSpawned(squadron, spawn.room.energyAvailable);
                break;
            }
            default: {
                log.error(function () { return "spawn/processSpawn: group " + group.creepGroupName + " of type " + group.creepGroupType.name + " not supported."; });
            }
        }
    }
    if (creepToBeSpawned.isPresent) {
        if (spawn.createCreep(creepToBeSpawned.get.bodyParts, creepToBeSpawned.get.creepName) == creepToBeSpawned.get.creepName) {
            log.callBacks.push(creepToBeSpawned.get.registerSuccess);
        }
        return;
    }
}
exports.processSpawn = processSpawn;
