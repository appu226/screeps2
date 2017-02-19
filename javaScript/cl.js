"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
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
