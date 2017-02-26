import creepUtils = require('./creep');
import memoryUtils = require('./memory');
import chainUtils = require('./chain');
import functional = require('./functional');
import log = require('./log');
import enums = require('./enums');
import sqdrn = require('./squadron');

export function processSpawn(spawn: Spawn) {
    var disabledCollection: boolean =
        (functional.sum(spawn.room.find<Source>(FIND_SOURCES_ACTIVE).map(
            source => memoryUtils.sourceMemory(source).energyCollection.total
        )) < 60);
    if (spawn.room.energyAvailable < (disabledCollection ? 300 : spawn.room.energyCapacityAvailable)
        || spawn.spawning != null)
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
        if (group.spawnId != spawn.id)
            continue;
        switch (group.creepGroupType.name) {
            case enums.eChain.name: {
                var chain = <chainUtils.Chain>group;
                creepToBeSpawned = chainUtils.creepToBeSpawned(chain, spawn.room.energyAvailable);
                break;
            }
            case enums.eSquadron.name: {
                var squadron = <sqdrn.Squadron>group;
                creepToBeSpawned = sqdrn.creepToBeSpawned(squadron, spawn.room.energyAvailable);
                break;
            }
            default: {
                log.error(() => `spawn/processSpawn: group ${group.creepGroupName} of type ${group.creepGroupType.name} not supported.`);
            }
        }
    }
    if (creepToBeSpawned.isPresent) {
        if (
            spawn.createCreep(
                creepToBeSpawned.get.bodyParts,
                creepToBeSpawned.get.creepName) == creepToBeSpawned.get.creepName) {
            log.callBacks.push(creepToBeSpawned.get.registerSuccess);
        }
        return;
    }
}