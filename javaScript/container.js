"use strict";
var ContainerWrapper = (function () {
    function ContainerWrapper(container, pv) {
        this.structure = container;
        this.my = container.room.controller.my;
        var supply = container.store[RESOURCE_ENERGY];
        this.resourceRequests = supply > 0
            ? [{
                    roomName: this.structure.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: supply,
                    requestorId: this.structure.id,
                    resourceRequestType: pv.PUSH_REQUEST
                }]
            : [];
    }
    ContainerWrapper.prototype.process = function (pv) {
    };
    return ContainerWrapper;
}());
function makeContainerWrapper(container, pv) {
    return new ContainerWrapper(container, pv);
}
exports.makeContainerWrapper = makeContainerWrapper;
