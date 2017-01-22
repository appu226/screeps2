import memoryUtils = require('./memory');
import log = require('./log');
import functional = require('./functional');
import chain = require('./chain');

export function executeCustomCommand() {

    var nextCommandNumber = 3;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(() => `Executing command ${nextCommandNumber}`)

        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}