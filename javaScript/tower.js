"use strict";
var TowerWrapper = (function () {
    function TowerWrapper(tower) {
        this.structure = tower;
        this.my = tower.my;
    }
    TowerWrapper.prototype.process = function (pv) {
    };
    return TowerWrapper;
}());
function makeTowerWrapper(tower) {
    return new TowerWrapper(tower);
}
exports.makeTowerWrapper = makeTowerWrapper;
