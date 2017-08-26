"use strict";
var ExtensionWrapper = (function () {
    function ExtensionWrapper(extension, pv) {
        this.structure = extension;
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
    return ExtensionWrapper;
}());
function makeExtensionWrapper(extension, pv) {
    return new ExtensionWrapper(extension, pv);
}
exports.makeExtensionWrapper = makeExtensionWrapper;
