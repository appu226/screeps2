import creepSwitch = require('./creep');
import dataCollectAll = require('./data');
import spawnBehavior = require('./spawn');
import cl = require('./cl');

export function loop(): void {

    cl.executeCustomCommand();

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