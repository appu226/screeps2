"use strict";
var o = require("./option");
function makeBuilderOrder(orderName, pv) {
    return {
        creepType: pv.CREEP_TYPE_BUILDER,
        name: pv.CREEP_TYPE_BUILDER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, CARRY, CARRY],
        addOnBody: [MOVE, CARRY, WORK, CARRY],
        maxEnergy: 1000,
        memory: makeBuilderMemory(pv)
    };
}
exports.makeBuilderOrder = makeBuilderOrder;
function makeBuilderMemory(pv) {
    return {
        constructionSiteId: o.None(),
        creepType: pv.CREEP_TYPE_BUILDER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
var BuilderCreepWrapper = (function () {
    function BuilderCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_BUILDER;
        this.memory = creep.memory;
    }
    BuilderCreepWrapper.prototype.process = function (pv) {
        var cs = null;
        if (this.memory.constructionSiteId !== undefined && this.memory.constructionSiteId.isPresent) {
            cs = pv.game.getObjectById(this.memory.constructionSiteId.get);
        }
        if (cs == null) {
            var constructionSites = pv.getConstructionSitesFromRoom(this.creep.room);
            if (constructionSites.length > 0) {
                cs = constructionSites[0];
            }
        }
        if (cs != null) {
            var buildAttempt = this.creep.build(cs);
            if (buildAttempt == ERR_NOT_IN_RANGE) {
                pv.moveCreep(this, cs.pos);
                pv.pushEfficiency(this.memory, 0);
            }
            else if (buildAttempt == OK) {
                pv.avoidObstacle(this);
                pv.pushEfficiency(this.memory, 1);
            }
            else {
                pv.avoidObstacle(this);
                pv.pushEfficiency(this.memory, 0);
            }
            this.memory.constructionSiteId = o.Some(cs.id);
        }
        else {
            pv.avoidObstacle(this);
            pv.pushEfficiency(this.memory, 0);
            this.memory.constructionSiteId = o.None();
        }
    };
    return BuilderCreepWrapper;
}());
exports.BuilderCreepWrapper = BuilderCreepWrapper;
