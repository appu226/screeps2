import init = require('./init');
import creepSwitch = require('./creep')
import dataCollectAll = require('./data')
import spawnBehavior = require('./spawn')

export function loop(): void {
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
    // console.log("Tick consumed: " + Game.cpu.getUsed());
}