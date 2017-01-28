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
            chain.addCreep(creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}
function executeCustomCommand() {
    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        // memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        // createChain("f5418cf86cdcafa8a05d2fcc", cu.eSource, "5daa0db5010afb8b3ce82c71", cu.eSpawn, "5daa0db5010afb8b3ce82c71");
        // addCreep("Chain9", cu.eHarvester, ["LinkSource7"], ["LinkHarvester10"]);
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
