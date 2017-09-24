"use strict";
var WallWrapper = (function () {
    function WallWrapper(wall) {
        this.element = wall;
        this.my = wall.room.controller === undefined ? false : wall.room.controller.my;
        this.resourceRequests = [];
    }
    WallWrapper.prototype.process = function (pv) {
    };
    WallWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from ConstructedWall");
    };
    WallWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot give energy to ConstructedWall");
    };
    return WallWrapper;
}());
function makeWallWrapper(wall) {
    return new WallWrapper(wall);
}
exports.makeWallWrapper = makeWallWrapper;
