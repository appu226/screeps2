"use strict";
var ExtensionWrapper = (function () {
    function ExtensionWrapper(extension) {
        this.structure = extension;
        this.my = extension.my;
    }
    ExtensionWrapper.prototype.process = function (pv) {
        var extension = this.structure;
        if (extension.energy < extension.energyCapacity) {
            pv.requestResourceReceive(extension.room.name, extension.id, false, RESOURCE_ENERGY, extension.energyCapacity - extension.energy);
        }
    };
    return ExtensionWrapper;
}());
function makeExtensionWrapper(extension) {
    return new ExtensionWrapper(extension);
}
exports.makeExtensionWrapper = makeExtensionWrapper;
