"use strict";
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
        addOnBody: [CARRY, WORK, WORK],
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
        var _this = this;
        return pv.getMyCreeps().filter(function (cw) {
            return cw.creepType == pv.CREEP_TYPE_TRANSPORTER &&
                cw.creep.room.name == _this.creep.room.name;
        }).length > 0;
    };
    HarvesterCreepWrapper.prototype.process = function (pv) {
        var _this = this;
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
                pv.pushEfficiency(this.memory, 1);
            }
        }
        else {
            pv.pushEfficiency(this.memory, 0);
            if (!this.roomHasTransporters(pv)) {
                var spawns = pv.getMyStructures().filter(function (sw) {
                    return sw.structure.structureType == STRUCTURE_SPAWN &&
                        sw.structure.room.name == _this.creep.room.name;
                });
                if (spawns.length > 0) {
                    var spawn = spawns[0].structure;
                    if (this.creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        pv.moveCreep(this, spawn.pos);
                    }
                }
            }
        }
        pv.requestResourceSend(this.creep.room.name, this.creep.id, true, RESOURCE_ENERGY, this.creep.carry.energy);
    };
    return HarvesterCreepWrapper;
}());
exports.HarvesterCreepWrapper = HarvesterCreepWrapper;
