"use strict";
var creepSwitch = require("./creep");
var dataCollectAll = require("./data");
var cl = require("./cl");
var spawnUtils = require("./spawn");
var log = require("./log");
var memoryUtils = require("./memory");
var chainUtils = require("./chain");
var struct = require("./struct");
var sqdrn = require("./squadron");
var enums = require("./enums");
function loop() {
    log.debug(function () { return "main/loop: Tick " + Game.time + " started."; });
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
                sqdrn.refreshGroup(groups[gidx]);
                break;
            default:
                log.error(function () { return "main/loop: Could not process group of index " + gidx; });
        }
    }
    for (var creepName in Game.creeps) {
        var creep = Game.creeps[creepName];
        try {
            creepSwitch.process(creep);
        }
        catch (e) {
            log.error(function () { return "main/loop: processing " + creepName + " failed with " + JSON.stringify(e); });
        }
    }
    if (mem.neutralStructures.length > 0) {
        var neutralStructure = mem.neutralStructures[Game.time % mem.neutralStructures.length];
        (new RoomPosition(neutralStructure.x, neutralStructure.y, neutralStructure.roomName)).createConstructionSite(neutralStructure.structureType);
    }
    log.callBacks.forEach(function (callBack) { try {
        callBack();
    }
    catch (e) {
        log.error(function () { return "Error in executing callback."; });
    } });
    log.callBacks = [];
    dataCollectAll.collect();
    // var endTime = performance.now();
    // console.log(`total time taken by main = ${endTime - startTime}ms`)
    log.debug(function () { return "main/loop: data collected. Tick " + Game.time + " consumed " + Game.cpu.getUsed() + " cycles."; });
}
exports.loop = loop;
