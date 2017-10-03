class LoggerImpl implements Logger {
    categories: Dictionary<boolean>;
    constructor(categories: Dictionary<boolean>) {
        this.categories = categories;
    }
    log(categories: string[], message: (() => string)) {
        if (this.categories["all"] || categories.some((cat: string) => this.categories[cat])) {
            console.log(message());
        }
    }

}

export function createLogger(categories: Dictionary<boolean>) {
    return new LoggerImpl(categories);
}