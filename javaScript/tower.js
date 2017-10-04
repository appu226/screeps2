"use strict";
var o = require("./option");
var TowerWrapper = (function () {
    function TowerWrapper(tower, pv) {
        this.element = tower;
        this.my = tower.my;
        var demand = tower.energyCapacity - tower.energy;
        this.resourceRequests = demand > 0
            ? [{
                    roomName: tower.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: tower.id,
                    resourceRequestType: pv.PULL_REQUEST,
                    isBlocker: tower.energy <= .75 * tower.energyCapacity
                }]
            : [];
    }
    TowerWrapper.prototype.process = function (pv) {
        var t = this.element;
        var closestAndWeakestFinder = function (c) {
            return 1.0 / pv.euclidean(t.pos, c.pos) / c.hits;
        };
        //attack closest and weakest enemy
        var enemies = pv.getHostileCreepsInRoom(t.room);
        var ce = o.maxBy(enemies, closestAndWeakestFinder);
        if (ce.isPresent) {
            t.attack(ce.get.elem);
            return;
        }
        //heal closest and weakest creep
        var myCreeps = pv.getMyCreepsByRoom(t.room).map(function (cw) { return cw.element; }).filter(function (c) { return c.hits < c.hitsMax; });
        var cc = o.maxBy(myCreeps, closestAndWeakestFinder);
        if (cc.isPresent) {
            t.heal(cc.get.elem);
            return;
        }
        // reserve 75% energy for attacking/healing
        var fullNess = t.energy / t.energyCapacity;
        if (fullNess < .75)
            return;
        var structures = pv.getMyStructuresByRoom(t.room).map(function (sw) { return sw.element; }).filter(function (s) { return s.hitsMax - s.hits >= 800; });
        var ss = o.maxBy(structures, function (s) { return -s.hits; });
        if (ss.isPresent) {
            t.repair(ss.get.elem);
        }
        return;
    };
    TowerWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from Tower.");
    };
    TowerWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return TowerWrapper;
}());
function makeTowerWrapper(tower, pv) {
    return new TowerWrapper(tower, pv);
}
exports.makeTowerWrapper = makeTowerWrapper;
