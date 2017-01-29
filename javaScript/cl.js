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
function executeCustomCommand() {
    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        // memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        // var transporterLinkName = addCreep("Chain3", cu.eTransporter, ["HarvestorLink2"], ["SpawnLink1"]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // createChain("66de2bae17e896771900f65e", cu.eSource, "c5739989d73eff2611f52ee3", cu.eController, "ab6610bdfe6d68c7c5e7fb1d");
        // var A = addCreep("Chain14", cu.eHarvester, ["LinkSource12"], ["LinkController13"]);
        // var B = addCreep("Chain14", cu.eUpdater, [A], ["LinkController13"]);
        // var C = addCreep("Chain14", cu.eTransporter, [A], [B]);
        // var D = addCreep("Chain14", cu.eTransporter, [C], [B]);
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
