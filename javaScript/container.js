"use strict";
var ContainerWrapper = (function () {
    function ContainerWrapper(container) {
        this.structure = container;
        this.my = container.room.controller.my;
    }
    ContainerWrapper.prototype.process = function (pv) {
    };
    return ContainerWrapper;
}());
function makeContainerWrapper(container) {
    return new ContainerWrapper(container);
}
exports.makeContainerWrapper = makeContainerWrapper;
