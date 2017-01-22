"use strict";
var creepSwitch = require("./creep");
var dataCollectAll = require("./data");
var cl = require("./cl");
var spawnUtils = require("./spawn");
var log = require("./log");
function loop() {
    log.debug(function () { return "main/loop: Tick " + Game.time + " started."; });
    cl.executeCustomCommand();
    log.debug(function () { return "main/loop: customCommand executed."; });
    for (var spawnName in Game.spawns) {
        var spawn = Game.spawns[spawnName];
        spawnUtils.processSpawn(spawn);
    }
    log.debug(function () { return "main/loop: all spawns processed."; });
    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        creepSwitch.process(creep);
    }
    log.debug(function () { return "main/loop: all creeps processed."; });
    dataCollectAll.collect();
    log.debug(function () { return "main/loop: data collected. Tick " + Game.time + " consumed " + Game.cpu.getUsed() + " cycles."; });
}
exports.loop = loop;
