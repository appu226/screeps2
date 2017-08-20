"use strict";
var o = require("./option");
var mterrain = require("./terrain");
var TowerWrapper = (function () {
    function TowerWrapper(tower) {
        this.structure = tower;
        this.my = tower.my;
    }
    TowerWrapper.prototype.process = function (pv) {
        var t = this.structure;
        var closestAndWeakestFinder = function (c) {
            return 1.0 / mterrain.euclidean(t.pos, c.pos, pv) / c.hits;
        };
        //attack closest and weakest enemy
        var enemies = pv.getHostileCreepsInRoom(t.room);
        var ce = o.maxBy(enemies, closestAndWeakestFinder);
        if (ce.isPresent) {
            t.attack(ce.get.elem);
            return;
        }
        //heal closest and weakest creep
        var myCreeps = pv.getMyCreepsByRoom(t.room).map(function (cw) { return cw.creep; }).filter(function (c) { return c.hits < c.hitsMax; });
        var cc = o.maxBy(myCreeps, closestAndWeakestFinder);
        if (cc.isPresent) {
            t.heal(cc.get.elem);
            return;
        }
        // reserve 75% energy for attacking/healing
        var fullNess = t.energy / t.energyCapacity;
        if (fullNess < .75)
            return;
        var structures = pv.getMyStructuresByRoom(t.room).map(function (sw) { return sw.structure; }).filter(function (s) { return s.hits < s.hitsMax; });
        var ss = o.maxBy(structures, closestAndWeakestFinder);
        if (ss.isPresent) {
            t.repair(ss.get.elem);
        }
        return;
    };
    return TowerWrapper;
}());
function makeTowerWrapper(tower) {
    return new TowerWrapper(tower);
}
exports.makeTowerWrapper = makeTowerWrapper;
