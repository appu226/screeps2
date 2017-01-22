import creepSwitch = require('./creep');
import dataCollectAll = require('./data');
import cl = require('./cl');
import spawnUtils = require('./spawn');
import log = require('./log');

export function loop(): void {
    log.debug(() => `main/loop: Tick ${Game.time} started.`);
    cl.executeCustomCommand();
    log.debug(() => `main/loop: customCommand executed.`);

    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        spawnUtils.processSpawn(spawn);
    }
    log.debug(() => `main/loop: all spawns processed.`);

    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        creepSwitch.process(creep);
    }
    log.debug(() => `main/loop: all creeps processed.`)

    dataCollectAll.collect();
    log.debug(() => `main/loop: data collected. Tick ${Game.time} consumed ${Game.cpu.getUsed()} cycles.`);
}