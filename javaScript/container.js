"use strict";
var ContainerWrapper = (function () {
    function ContainerWrapper(container, pv) {
        this.element = container;
        this.my = container.room.controller.my;
        var supply = container.store[RESOURCE_ENERGY];
        this.resourceRequests = supply > 0
            ? [{
                    roomName: this.element.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: supply,
                    requestorId: this.element.id,
                    resourceRequestType: pv.PUSH_REQUEST
                }]
            : [];
    }
    ContainerWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return creep.withdraw(this.element, resourceType, amount);
    };
    ContainerWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    ContainerWrapper.prototype.process = function (pv) {
    };
    return ContainerWrapper;
}());
function makeContainerWrapper(container, pv) {
    return new ContainerWrapper(container, pv);
}
exports.makeContainerWrapper = makeContainerWrapper;
