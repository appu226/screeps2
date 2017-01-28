import memoryUtils = require('./memory');
import log = require('./log');
import functional = require('./functional');
import chain = require('./chain');
import enums = require('./enums');

function createSourceToSpawnChain(sourceId: string, spawnId: string) {
    memoryUtils.enrichedMemory().creepGroups.push(chain.createSourceToSpawnChain(sourceId, spawnId));
}

function addTransporterToChain(chainName: string, sourceLinkName: string, destinationLinkName: string) {
    for(var groupIdx = 0; groupIdx < memoryUtils.enrichedMemory().creepGroups.length; ++groupIdx) {
        var group = memoryUtils.enrichedMemory().creepGroups[groupIdx];
        if (group.creepGroupType.name == enums.eChain.name && group.creepGroupName == chainName) {
            var theChain = <chain.Chain>group;
            chain.addCreep(theChain, "TRANSPORT", [sourceLinkName], [destinationLinkName]);
        }
    }
}

export function executeCustomCommand() {

    var nextCommandNumber = 0;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(() => `Executing command ${nextCommandNumber}`)
        //createSourceToSpawnChain("2b142296f7490604e687c16f", "2db005a02a4fe5394ade3f45");
        //addTransporterToChain("Chain8", "HarvestorLink7", "SpawnLink6")
        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}