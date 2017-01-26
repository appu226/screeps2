import memoryUtils = require('./memory');
import log = require('./log');
import functional = require('./functional');
import chain = require('./chain');

function createSourceToSpawnChain(sourceId: string, spawnId: string) {
    memoryUtils.enrichedMemory().creepGroups.push(chain.createSourceToSpawnChain(sourceId, spawnId));
}

function addTransporterToChain(chainName: string, sourceLinkName: string, destinationLinkName: string) {
    for(var groupIdx = 0; groupIdx < memoryUtils.enrichedMemory().creepGroups.length; ++groupIdx) {
        var group = memoryUtils.enrichedMemory().creepGroups[groupIdx];
        if (group.creepGroupType == "CHAIN" && group.creepGroupName == chainName) {
            var theChain = <chain.Chain>group;
            chain.addCreep(theChain, "TRANSPORTER", [sourceLinkName], [destinationLinkName]);
        }
    }
}

export function executeCustomCommand() {

    var nextCommandNumber = 5;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(() => `Executing command ${nextCommandNumber}`)
        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}