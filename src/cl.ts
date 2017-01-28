import memoryUtils = require('./memory');
import log = require('./log');
import fun = require('./functional');
import chain = require('./chain');
import cu = require('./creep');
import enums = require('./enums');

function createChain(
    sourceId: string, sourceType: cu.ETargetType,
    targetId: string, targetType: cu.ETargetType,
    spawnId: string,
    sourceCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>(),
    targetCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>()
) {
    var chn = chain.createChain(
        sourceId, sourceType,
        targetId, targetType,
        spawnId,
        sourceCreepType, targetCreepType);
    if (chn != null)
        memoryUtils.enrichedMemory().creepGroups.push(chn);
}

function addCreep(
    chainName: string,
    creepType: cu.ECreepType,
    sourceLinkNames: string[],
    destinationLinkNames: string[]
) {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            chain.addCreep(<chain.Chain>creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}

export function executeCustomCommand() {
    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        // memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(() => `Executing command ${nextCommandNumber}`)
        // createChain("f5418cf86cdcafa8a05d2fcc", cu.eSource, "5daa0db5010afb8b3ce82c71", cu.eSpawn, "5daa0db5010afb8b3ce82c71");
        // addCreep("Chain9", cu.eHarvester, ["LinkSource7"], ["LinkHarvester10"]);
        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}