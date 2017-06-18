"use strict";
var LoggerImpl = (function () {
    function LoggerImpl(logLevel, pv) {
        this.logLevel = logLevel;
        this.pv = pv;
        this.msgLevelStr = ["SILENT", "ERROR", "WARN", "INFO", "DEBUG"];
    }
    LoggerImpl.prototype.selectivePrint = function (msgLevel, message) {
        if (msgLevel >= this.logLevel)
            console.log("[" + this.msgLevelStr[msgLevel] + "] " + message);
    };
    LoggerImpl.prototype.debug = function (message) {
        this.selectivePrint(this.pv.LOG_LEVEL_DEBUG, message);
    };
    LoggerImpl.prototype.info = function (message) {
        this.selectivePrint(this.pv.LOG_LEVEL_INFO, message);
    };
    LoggerImpl.prototype.warn = function (message) {
        this.selectivePrint(this.pv.LOG_LEVEL_WARN, message);
    };
    LoggerImpl.prototype.error = function (message) {
        this.selectivePrint(this.pv.LOG_LEVEL_ERROR, message);
    };
    LoggerImpl.prototype.setLogLevel = function (logLevel) {
        this.logLevel = logLevel;
    };
    return LoggerImpl;
}());
function createLogger(logLevel, pv) {
    return new LoggerImpl(logLevel, pv);
}
exports.createLogger = createLogger;
