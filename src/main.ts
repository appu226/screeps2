import creepSwitch = require('./creep');
import dataCollectAll = require('./data');
import cl = require('./cl');
import spawnUtils = require('./spawn');
import log = require('./log');

export function loop(): void {
    log.debug(() => `main/loop: Tick ${Game.time} started.`);
    cl.executeCustomCommand();

    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        spawnUtils.processSpawn(spawn);
    }

    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        creepSwitch.process(creep);
    }

    dataCollectAll.collect();
    log.debug(() => `main/loop: data collected. Tick ${Game.time} consumed ${Game.cpu.getUsed()} cycles.`);
}