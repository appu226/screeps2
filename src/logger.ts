class LoggerImpl implements Logger {
    logLevel: number;
    pv: Paraverse;
    constructor(logLevel: number, pv: Paraverse) {
        this.logLevel = logLevel;
        this.pv = pv;
    }
    selectivePrint(msgLevel: number, message: string) {
        if(msgLevel >= this.logLevel) console.log(message);
    }
    debug(message: string): void {
        this.selectivePrint(this.pv.LOG_LEVEL_DEBUG, message);
    }
    info(message: string): void {
        this.selectivePrint(this.pv.LOG_LEVEL_INFO, message);
    }
    warn(message: string): void {
        this.selectivePrint(this.pv.LOG_LEVEL_WARN, message);
    }
    error(message: string): void {
        this.selectivePrint(this.pv.LOG_LEVEL_ERROR, message);
    }
    setLogLevel(logLevel: number): void {
        this.logLevel = logLevel;
    }
}

export function createLogger(logLevel: number, pv: Paraverse) {
    return new LoggerImpl(logLevel, pv);
}