"use strict";
var mopt = require("./option");
var mter = require("./terrain");
function isHarvesterWithSource(creepWrapper, sourceId, pv) {
    return creepWrapper.creepType == pv.CREEP_TYPE_HARVESTER &&
        creepWrapper.memory.sourceId == sourceId;
}
exports.isHarvesterWithSource = isHarvesterWithSource;
function makeHarvesterOrder(orderName, sourceId, pv) {
    return {
        creepType: pv.CREEP_TYPE_HARVESTER,
        name: pv.CREEP_TYPE_HARVESTER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [WORK, CARRY, WORK],
        maxEnergy: 1000,
        memory: makeHarvesterMemory(sourceId, pv)
    };
}
exports.makeHarvesterOrder = makeHarvesterOrder;
function makeHarvesterMemory(sourceId, pv) {
    return {
        sourceId: sourceId,
        creepType: pv.CREEP_TYPE_HARVESTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
var HarvesterCreepWrapper = (function () {
    function HarvesterCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = creep.memory;
    }
    HarvesterCreepWrapper.prototype.roomHasTransporters = function (pv) {
        return pv.getMyCreepsByRoomAndType(this.creep.room, pv.CREEP_TYPE_TRANSPORTER).length > 0;
    };
    HarvesterCreepWrapper.prototype.process = function (pv) {
        var _this = this;
        if (this.creep.carryCapacity == 0) {
            pv.avoidObstacle(this);
            return;
        }
        if (this.creep.carry.energy < this.creep.carryCapacity) {
            var source = pv.game.getObjectById(this.memory.sourceId);
            if (source == null) {
                pv.pushEfficiency(this.memory, 0);
                return;
            }
            var harvestAttempt = this.creep.harvest(source);
            if (harvestAttempt == ERR_NOT_IN_RANGE) {
                pv.pushEfficiency(this.memory, 0);
                pv.moveCreep(this, source.pos);
            }
            else if (source.energy == 0) {
                pv.pushEfficiency(this.memory, 0);
            }
            else {
                pv.log.error("Harevet attempt by " + this.creep.name + " failed with error " + harvestAttempt + ".");
                pv.pushEfficiency(this.memory, 1);
            }
        }
        else {
            pv.pushEfficiency(this.memory, 0);
            var targets = pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_SPAWN).concat(pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_CONTAINER)).concat(pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_EXTENSION));
            var closest = mopt.maxBy(targets, function (sw) { return -1 * mter.euclidean(sw.structure.pos, _this.creep.pos, pv); });
            if (closest.isPresent) {
                var target = closest.get.elem;
                if (this.creep.transfer(target.structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, target.structure.pos);
                }
            }
        }
        pv.requestResourceSend(this.creep.room.name, this.creep.id, true, RESOURCE_ENERGY, this.creep.carry.energy);
    };
    return HarvesterCreepWrapper;
}());
exports.HarvesterCreepWrapper = HarvesterCreepWrapper;
