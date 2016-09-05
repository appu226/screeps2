import init = require('./init');
import creepSwitch = require('./creep.switch')
import dataCollectAll = require('./data.collect.all')
import spawnBehavior = require('./spawn.behavior')

export function loop(): void {
    console.log("hello");
    init.initializeAll(false);
    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        creepSwitch.process(creep);
    }
    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        spawnBehavior.process(spawn)
    }
    dataCollectAll.collect();
}