"use strict";
var WallWrapper = (function () {
    function WallWrapper(wall, pv) {
        this.structure = wall;
        this.my = wall.room.controller.my;
    }
    WallWrapper.prototype.process = function (pv) {
    };
    return WallWrapper;
}());
function makeWallWrapper(wall, pv) {
    return new WallWrapper(wall, pv);
}
exports.makeWallWrapper = makeWallWrapper;
