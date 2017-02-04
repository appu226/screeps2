"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var fun = require("./functional");
var chain = require("./chain");
var enums = require("./enums");
function createChain(sourceId, sourceType, targetId, targetType, spawnId, sourceCreepType, targetCreepType) {
    if (sourceCreepType === void 0) { sourceCreepType = fun.None(); }
    if (targetCreepType === void 0) { targetCreepType = fun.None(); }
    var chn = chain.createChain(sourceId, sourceType, targetId, targetType, spawnId, sourceCreepType, targetCreepType);
    if (chn != null)
        memoryUtils.enrichedMemory().creepGroups.push(chn);
}
exports.createChain = createChain;
function addNonCreepLink(chainName, target, isSource, isDestination) {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addNonCreep(creepGroup, target, isSource, isDestination);
        }
    }
}
exports.addNonCreepLink = addNonCreepLink;
function addCreep(chainName, creepType, sourceLinkNames, destinationLinkNames) {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addCreep(creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}
exports.addCreep = addCreep;
function executeCustomCommand() {
    var nextCommandNumber = 16;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        // var transporterLinkName = addCreep("Chain3", cu.eTransporter, ["HarvestorLink2"], ["SpawnLink1"]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // var controllerName = addNonCreepLink("Chain3", { targetType: cu.eController, targetId: "5836b6ae8b8b9619519ef1eb" }, false, true);
        // var source2Name = addNonCreepLink("Chain3", { targetType: cu.eSource, targetId: "5836b6ae8b8b9619519ef1ea" }, true, false);
        // var harvestor = addCreep("Chain3", cu.eHarvester, [source2Name], [controllerName]);
        // var updator = addCreep("Chain3", cu.eUpdater, [harvestor], [controllerName]);
        // var transporter = addCreep("Chain3", cu.eTransporter, [harvestor], [updator]);
        // var spawn = Game.spawns["Spawn1"];
        // spawn.createCreep(
        //     cu.createBodyParts(cu.eTransporter, spawn.energy),
        //     "Transporter18",
        //     cu.makeCreepMemory(
        //         cu.eUpdater,
        //         [{ targetType: cu.eCreep, targetId: "588d95f462b19a2f5dd70931" }],
        //         [{ targetType: cu.eCreep, targetId: "588d996ca105e832025a80d7" }]
        //     )
        // );
        // var crossLink = addCreep("Chain3", cu.eTransporter, ["LinkTransporter5"], ["LinkUpdater14"]);
        // addCreep("Chain3", cu.eTransporter, ["LinkTransporter5"], ["LinkTransporter19"]);
        // addCreep("Chain3", cu.eUpdater, ["LinkTransporter15", "LinkTransporter19"], ["LinkController11"]);
        // addCreep("Chain3", cu.eTransporter, ["LinkTransporter21"], ["LinkTransporter19"]);
        // addCreep("Chain3", cu.eBuilder, ["LinkTransporter21"], ["SpawnLink1"]);
        // var pos = new RoomPosition(8, 17, "W75S2");
        // pos.createConstructionSite(STRUCTURE_ROAD);
        // var roomName = "W75S2";
        // var allPos: RoomPosition[] = [];
        // var pathStart = new RoomPosition(19, 38, roomName);
        // var pathEnd = new RoomPosition(24, 47, roomName);
        // allPos.push(pathStart)
        // allPos.push(pathEnd);
        // var shortestPath = pathStart.findPathTo(pathEnd, {ignoreCreeps: true});
        // for (var spi = 0; spi < shortestPath.length; ++spi) {
        //     allPos.push(new RoomPosition(shortestPath[spi].x, shortestPath[spi].y, roomName));
        // }
        // for (var api = 0; api < allPos.length; ++api) {
        //     allPos[api].createConstructionSite(STRUCTURE_ROAD);
        // }
        // for (var y = 44; y < 47; ++y) {
        //     (new RoomPosition(24, y, roomName)).createConstructionSite(STRUCTURE_ROAD);
        // }
        // addCreep("Chain3", cu.eUpdater, ["LinkTransporter15", "LinkTransporter19"], ["LinkController11"]);
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
