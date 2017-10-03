"use strict";
var LoggerImpl = (function () {
    function LoggerImpl(categories) {
        this.categories = categories;
    }
    LoggerImpl.prototype.log = function (categories, message) {
        var _this = this;
        if (this.categories["all"] || categories.some(function (cat) { return _this.categories[cat]; })) {
            console.log(message());
        }
    };
    return LoggerImpl;
}());
function createLogger(categories) {
    return new LoggerImpl(categories);
}
exports.createLogger = createLogger;
