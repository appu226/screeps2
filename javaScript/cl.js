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
    var nextCommandNumber = 5;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        // delete (memoryUtils.enrichedMemory()).isInitialized;
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
