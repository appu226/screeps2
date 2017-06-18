"use strict";
var ExtensionWrapper = (function () {
    function ExtensionWrapper(extension) {
        this.structure = extension;
        this.my = extension.my;
    }
    ExtensionWrapper.prototype.process = function (pv) {
    };
    return ExtensionWrapper;
}());
function makeExtensionWrapper(extension) {
    return new ExtensionWrapper(extension);
}
exports.makeExtensionWrapper = makeExtensionWrapper;
