"use strict";
var RoadWrapper = (function () {
    function RoadWrapper(road) {
        this.element = road;
        this.my = road.room.controller.my;
        this.resourceRequests = [];
    }
    RoadWrapper.prototype.process = function (pv) {
    };
    RoadWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot give energy to road.");
    };
    RoadWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from road.");
    };
    return RoadWrapper;
}());
function makeRoadWrapper(road) {
    return new RoadWrapper(road);
}
exports.makeRoadWrapper = makeRoadWrapper;
