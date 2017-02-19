import memoryUtils = require('./memory');
import log = require('./log');
import fun = require('./functional');
import chain = require('./chain');
import cu = require('./creep');
import enums = require('./enums');

export function createChain(
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

export function addNonCreepLink(
    chainName: string,
    target: cu.Target,
    isSource: Boolean,
    isDestination: Boolean
): string {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addNonCreep(<chain.Chain>creepGroup, target, isSource, isDestination);
        }
    }
}

export function addCreep(
    chainName: string,
    creepType: cu.ECreepType,
    sourceLinkNames: string[],
    destinationLinkNames: string[]
): string {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addCreep(<chain.Chain>creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}

export function executeCustomCommand() {
    var nextCommandNumber = 5;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {

        // delete (memoryUtils.enrichedMemory()).isInitialized;
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(() => `Executing command ${nextCommandNumber}`);

        

        log.info(() => `Successfully executed command ${nextCommandNumber}`);
    }
}