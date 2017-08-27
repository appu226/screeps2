"use strict";
var ExtensionWrapper = (function () {
    function ExtensionWrapper(extension, pv) {
        this.element = extension;
        this.my = extension.my;
        var demand = extension.energyCapacity - extension.energy;
        this.resourceRequests =
            demand > 0
                ? [{
                        roomName: extension.room.name,
                        resourceType: RESOURCE_ENERGY,
                        amount: demand,
                        requestorId: extension.id,
                        resourceRequestType: pv.PULL_REQUEST
                    }]
                : [];
    }
    ExtensionWrapper.prototype.process = function (pv) {
    };
    ExtensionWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Extension (" + this.element.id + ") cannot be asked to give resource.");
    };
    ExtensionWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return ExtensionWrapper;
}());
function makeExtensionWrapper(extension, pv) {
    return new ExtensionWrapper(extension, pv);
}
exports.makeExtensionWrapper = makeExtensionWrapper;
