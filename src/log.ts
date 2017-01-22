import memoryUtils = require('./memory');

function log(msg: () => string, level: number): void {
    if (memoryUtils.enrichedMemory().logLevel >= level) {
        console.log(msg());
    }
}

export function debug(msg: () => string) {
    log(msg, memoryUtils.LogLevel.DEBUG)
}

export function info(msg: () => string) {
    log(msg, memoryUtils.LogLevel.INFO)
}

export function warn(msg: () => string) {
    log(msg, memoryUtils.LogLevel.WARN)
}

export function error(msg: () => string) {
    log(msg, memoryUtils.LogLevel.ERROR)
}