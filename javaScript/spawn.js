"use strict";
var memoryUtils = require("./memory");
var chainUtils = require("./chain");
var functional = require("./functional");
var log = require("./log");
var enums = require("./enums");
function processSpawn(spawn) {
    if (spawn.energy < spawn.energyCapacity || spawn.spawning != null)
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
        if (group.creepGroupType.name != enums.eChain.name)
            return;
        var chain = group;
        creepToBeSpawned = chainUtils.creepToBeSpawned(chain, spawn.room.energyAvailable);
    }
    if (creepToBeSpawned.isPresent) {
        spawn.createCreep(creepToBeSpawned.get.bodyParts, creepToBeSpawned.get.creepName);
        return;
    }
}
exports.processSpawn = processSpawn;
