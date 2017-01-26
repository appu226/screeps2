"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var chain = require("./chain");
function createSourceToSpawnChain(sourceId, spawnId) {
    memoryUtils.enrichedMemory().creepGroups.push(chain.createSourceToSpawnChain(sourceId, spawnId));
}
function addTransporterToChain(chainName, sourceLinkName, destinationLinkName) {
    for (var groupIdx = 0; groupIdx < memoryUtils.enrichedMemory().creepGroups.length; ++groupIdx) {
        var group = memoryUtils.enrichedMemory().creepGroups[groupIdx];
        if (group.creepGroupType == "CHAIN" && group.creepGroupName == chainName) {
            var theChain = group;
            chain.addCreep(theChain, "TRANSPORTER", [sourceLinkName], [destinationLinkName]);
        }
    }
}
function executeCustomCommand() {
    var nextCommandNumber = 5;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
