"use strict";
var memoryUtils = require("./memory");
function log(msg, level) {
    if (memoryUtils.enrichedMemory().logLevel >= level) {
        console.log(msg());
    }
}
function debug(msg) {
    log(msg, memoryUtils.LogLevel.DEBUG);
}
exports.debug = debug;
function info(msg) {
    log(msg, memoryUtils.LogLevel.INFO);
}
exports.info = info;
function warn(msg) {
    log(msg, memoryUtils.LogLevel.WARN);
}
exports.warn = warn;
function error(msg) {
    log(msg, memoryUtils.LogLevel.ERROR);
}
exports.error = error;
exports.callBacks = [];
