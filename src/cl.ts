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
    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        // memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(() => `Executing command ${nextCommandNumber}`)
        // var transporterLinkName = addCreep("Chain3", cu.eTransporter, ["HarvestorLink2"], ["SpawnLink1"]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
    
        // createChain("66de2bae17e896771900f65e", cu.eSource, "c5739989d73eff2611f52ee3", cu.eController, "ab6610bdfe6d68c7c5e7fb1d");
        // var A = addCreep("Chain14", cu.eHarvester, ["LinkSource12"], ["LinkController13"]);
        // var B = addCreep("Chain14", cu.eUpdater, [A], ["LinkController13"]);
        // var C = addCreep("Chain14", cu.eTransporter, [A], [B]);
        // var D = addCreep("Chain14", cu.eTransporter, [C], [B]);

        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}