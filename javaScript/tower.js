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
        pv.requestResourceReceive(t.room.name, t.id, false, RESOURCE_ENERGY, t.energyCapacity - t.energy);
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
        var mem = pv.getTowerMemory(t.id);
        var target = pv.game.getObjectById(mem.target);
        if (target === undefined || target == null)
            mem.status = "free";
        if (mem.status == "free")
            this.resetMemStatus(mem, pv);
        switch (mem.status) {
            case "free": break;
            case "other":
                this.repairOther(mem, pv);
                break;
            case "wall":
                this.repairWallOrRampart(mem, pv);
                break;
            case "rampart":
                this.repairWallOrRampart(mem, pv);
                break;
            default: break;
        }
        return;
    };
    TowerWrapper.prototype.repairOther = function (mem, pv) {
        var t = this.structure;
        var target = pv.game.getObjectById(mem.target);
        if (target === undefined || target == null || target.hits == target.hitsMax) {
            pv.log.debug("tower/repairOther: setting tower " + t.id + " status to free.");
            mem.status = "free";
            return;
        }
        t.repair(target);
    };
    TowerWrapper.prototype.repairWallOrRampart = function (mem, pv) {
        var t = this.structure;
        var hitPoints = pv.getWallHitPoints(t.room);
        var target = pv.game.getObjectById(mem.target);
        if (target === undefined || target == null || target.hits == target.hitsMax || target.hits >= hitPoints) {
            pv.log.debug("tower/repairWallOrRampart: setting tower " + t.id + " status to free.");
            mem.status = "free";
            return;
        }
        t.repair(target);
    };
    TowerWrapper.prototype.resetMemStatus = function (mem, pv) {
        var t = this.structure;
        var str = partitionStructures(t.room, pv);
        var wallHitPoints = pv.getWallHitPoints(t.room);
        var reset = this.findWeakestStructure(str.ramparts, wallHitPoints, "rampart", mem) ||
            this.findWeakestStructure(str.walls, wallHitPoints, "wall", mem) ||
            this.findWeakestStructure(str.roads, 1000000000, "other", mem) ||
            this.findWeakestStructure(str.others, 1000000000, "other", mem);
        // if all is well, set the bar higher for wall/rampart health
        if (!reset && t.room.controller.level >= 2) {
            pv.setWallHitPoints(t.room, Math.min(wallHitPoints + 1000, RAMPART_HITS_MAX[t.room.controller.level]));
        }
        if (reset)
            pv.log.debug("tower/resetMemStatus: setting tower " + t.id + " status to " + mem.status + ".");
    };
    TowerWrapper.prototype.findWeakestStructure = function (str, hitPoints, status, mem) {
        var weakest = o.maxBy(str, function (s) { return s.hits * -1; });
        if (weakest.isPresent && weakest.get.elem.hits < weakest.get.elem.hitsMax && weakest.get.elem.hits < hitPoints) {
            mem.status = status;
            mem.target = weakest.get.elem.id;
            return true;
        }
        return false;
    };
    return TowerWrapper;
}());
function partitionStructures(room, pv) {
    var str = pv.getMyStructures();
    var res = {
        walls: [],
        ramparts: [],
        roads: [],
        others: []
    };
    for (var i = 0; i < str.length; ++i) {
        var sw = str[i];
        if (!sw.my)
            continue;
        switch (sw.structure.structureType) {
            case STRUCTURE_WALL:
                res.walls.push(sw.structure);
                break;
            case STRUCTURE_ROAD:
                res.roads.push(sw.structure);
                break;
            case STRUCTURE_RAMPART:
                res.ramparts.push(sw.structure);
                break;
            default:
                res.others.push(sw.structure);
                break;
        }
    }
    return res;
}
function makeTowerWrapper(tower) {
    return new TowerWrapper(tower);
}
exports.makeTowerWrapper = makeTowerWrapper;
