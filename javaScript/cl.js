"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
function executeCustomCommand() {
    var nextCommandNumber = 3;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
