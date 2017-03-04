import creepSwitch = require('./creep');
import dataCollectAll = require('./data');
import cl = require('./cl');
import spawnUtils = require('./spawn');
import log = require('./log');
import memoryUtils = require('./memory');
import chainUtils = require('./chain');
import struct = require('./struct');
import map = require('./map');
import sqdrn = require('./squadron');
import enums = require('./enums');

export function loop(): void {
    log.debug(() => `main/loop: Tick ${Game.time} started.`);
    // PathFinder.use(Game.time % 2 == 0);
    cl.executeCustomCommand();
    var mem = memoryUtils.enrichedMemory();
    // var startTime = performance.now();

    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        spawnUtils.processSpawn(spawn);
    }

    for (var structure in Game.structures) {
        struct.processStructure(Game.structures[structure]);
    }

    var groups = mem.creepGroups;
    for (var gidx = 0; gidx < groups.length; ++gidx) {
        switch (groups[gidx].creepGroupType.name) {
            case enums.eChain.name:
                chainUtils.refreshGroup(groups[gidx]);
                break;
            case enums.eSquadron.name:
                sqdrn.refreshGroup(<sqdrn.Squadron>groups[gidx]);
                break;
            default:
                log.error(() => `main/loop: Could not process group of index ${gidx}`);
        }
    }

    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        try {
            creepSwitch.process(creep);
        } catch (e) {
            log.error(() => `main/loop: processing ${creepName} failed with ${JSON.stringify(e)}`);
        }
    }

    if (mem.neutralStructures.length > 0) {
        var neutralStructure = mem.neutralStructures[Game.time % mem.neutralStructures.length];
        (new RoomPosition(
            neutralStructure.x,
            neutralStructure.y,
            neutralStructure.roomName
        )).createConstructionSite(neutralStructure.structureType);
    }

    log.callBacks.forEach(callBack => { try { callBack() } catch (e) { log.error(() => "Error in executing callback.") } });
    log.callBacks = [];

    dataCollectAll.collect();
    // var endTime = performance.now();
    // console.log(`total time taken by main = ${endTime - startTime}ms`)
    log.debug(() => `main/loop: data collected. Tick ${Game.time} consumed ${Game.cpu.getUsed()} cycles.`);
}