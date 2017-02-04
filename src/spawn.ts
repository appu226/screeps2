import creepUtils = require('./creep');
import memoryUtils = require('./memory');
import chainUtils = require('./chain');
import functional = require('./functional');
import log = require('./log');
import enums = require('./enums');

export function processSpawn(spawn: Spawn) {
    if (spawn.energy < spawn.energyCapacity || spawn.spawning != null)
        return;
    var groups = memoryUtils.enrichedMemory().creepGroups;
    if (groups.length == 0) {
        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];
            var source = spawn.pos.findClosestByPath<Source>(FIND_SOURCES_ACTIVE);
            if (spawn == null || spawn === undefined)
                return log.error(() => `Could not find spawn with name ${spawnName}`);
            if (source == null || source === undefined)
                return log.error(() => `Could not find closest source to spawn with name ${spawnName}`);
            memoryUtils.enrichedMemory().creepGroups.push(chainUtils.createSourceToSpawnChain(source.id, spawn.id));
        }
        groups = memoryUtils.enrichedMemory().creepGroups;
    }
    var creepToBeSpawned: functional.Option<creepUtils.CreepToBeSpawned> = functional.None<creepUtils.CreepToBeSpawned>();
    for (var groupNum = 0; groupNum < groups.length && !creepToBeSpawned.isPresent; ++groupNum) {
        var group = groups[groupNum];
        if (group.creepGroupType.name != enums.eChain.name)
            return;
        var chain = <chainUtils.Chain>group;
        creepToBeSpawned = chainUtils.creepToBeSpawned(chain, spawn.energy);
    }
    if (creepToBeSpawned.isPresent) {
        spawn.createCreep(
            creepToBeSpawned.get.bodyParts,
            creepToBeSpawned.get.creepName);
        return;
    }
}