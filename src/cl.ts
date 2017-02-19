import memoryUtils = require('./memory');
import log = require('./log');
import fun = require('./functional');
import chain = require('./chain');
import cu = require('./creep');
import enums = require('./enums');

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