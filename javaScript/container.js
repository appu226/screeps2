"use strict";
var ContainerWrapper = (function () {
    function ContainerWrapper(container) {
        this.structure = container;
        this.my = container.room.controller.my;
    }
    ContainerWrapper.prototype.process = function (pv) {
        var container = this.structure;
        var storedEnergy = container.store[RESOURCE_ENERGY];
        if (storedEnergy < container.storeCapacity) {
            pv.requestResourceReceive(container.room.name, container.id, false, RESOURCE_ENERGY, 50);
        }
        if (storedEnergy > 0) {
            pv.requestResourceSend(container.room.name, container.id, false, RESOURCE_ENERGY, storedEnergy);
        }
    };
    return ContainerWrapper;
}());
function makeContainerWrapper(container) {
    return new ContainerWrapper(container);
}
exports.makeContainerWrapper = makeContainerWrapper;
