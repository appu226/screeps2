"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var chain = require("./chain");
var enums = require("./enums");
function createSourceToSpawnChain(sourceId, spawnId) {
    memoryUtils.enrichedMemory().creepGroups.push(chain.createSourceToSpawnChain(sourceId, spawnId));
}
function addTransporterToChain(chainName, sourceLinkName, destinationLinkName) {
    for (var groupIdx = 0; groupIdx < memoryUtils.enrichedMemory().creepGroups.length; ++groupIdx) {
        var group = memoryUtils.enrichedMemory().creepGroups[groupIdx];
        if (group.creepGroupType.name == enums.eChain.name && group.creepGroupName == chainName) {
            var theChain = group;
            chain.addCreep(theChain, "TRANSPORT", [sourceLinkName], [destinationLinkName]);
        }
    }
}
function executeCustomCommand() {
    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        //createSourceToSpawnChain("2b142296f7490604e687c16f", "2db005a02a4fe5394ade3f45");
        //addTransporterToChain("Chain8", "HarvestorLink7", "SpawnLink6")
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
