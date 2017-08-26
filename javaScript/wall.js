"use strict";
var WallWrapper = (function () {
    function WallWrapper(wall) {
        this.structure = wall;
        this.my = wall.room.controller.my;
        this.resourceRequests = [];
    }
    WallWrapper.prototype.process = function (pv) {
    };
    return WallWrapper;
}());
function makeWallWrapper(wall) {
    return new WallWrapper(wall);
}
exports.makeWallWrapper = makeWallWrapper;
