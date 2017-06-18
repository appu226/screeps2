"use strict";
var RoadWrapper = (function () {
    function RoadWrapper(road) {
        this.structure = road;
        this.my = road.room.controller.my;
    }
    RoadWrapper.prototype.process = function (pv) {
    };
    return RoadWrapper;
}());
function makeRoadWrapper(road) {
    return new RoadWrapper(road);
}
exports.makeRoadWrapper = makeRoadWrapper;
