"use strict";
var mopt = require("./option");
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
        addOnBody: [MOVE, WORK, MOVE, CARRY, WORK],
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
        totalEfficiency: 0,
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    };
}
var HarvesterCreepWrapper = (function () {
    function HarvesterCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = creep.memory;
        var demand = pv.resourceAmount(creep.carry, RESOURCE_ENERGY);
        this.resourceRequests = demand > 0
            ? [{
                    roomName: creep.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: creep.id,
                    resourceRequestType: pv.PUSH_REQUEST,
                    isBlocker: pv.availableSpace(creep.carry, creep.carryCapacity) == 0
                }]
            : [];
    }
    HarvesterCreepWrapper.prototype.roomHasTransporters = function (pv) {
        return pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_TRANSPORTER).length > 0;
    };
    HarvesterCreepWrapper.prototype.process = function (pv) {
        var _this = this;
        if (this.element.carryCapacity == 0) {
            pv.avoidObstacle(this);
            return;
        }
        if (this.element.carry.energy < this.element.carryCapacity) {
            var source = pv.game.getObjectById(this.memory.sourceId);
            if (source == null) {
                pv.pushEfficiency(this.memory, 0);
                return;
            }
            var harvestAttempt_1 = this.element.harvest(source);
            if (harvestAttempt_1 == ERR_NOT_IN_RANGE) {
                pv.pushEfficiency(this.memory, 0);
                pv.moveCreep(this, source.pos);
            }
            else if (source.energy == 0) {
                pv.pushEfficiency(this.memory, 0);
            }
            else {
                if (harvestAttempt_1 != OK)
                    pv.log(["harvestor", "process", "HarvestorCreepWrapper.process"], function () { return "harvestor.ts/HarvestorCreepWrapper.process: Harvest attempt by " + _this.element.name + " failed with error " + harvestAttempt_1 + "."; });
                pv.pushEfficiency(this.memory, 1);
            }
        }
        else {
            pv.pushEfficiency(this.memory, 0);
            var targets = pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_SPAWN).filter(function (sw) { return isFreeSpawn(sw); }).concat(pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_CONTAINER).filter(function (sw) { return isFreeContainer(sw); })).concat(pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_EXTENSION).filter(function (sw) { return isFreeExtension(sw); }));
            var closest = mopt.maxBy(targets, function (sw) { return -1 * pv.manhattan(sw.element.pos, _this.element.pos); });
            if (closest.isPresent
                && (pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_TRANSPORTER).length == 0
                    || closest.get.measure * -1 < 5)) {
                var target = closest.get.elem;
                if (this.element.transfer(target.element, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, target.element.pos);
                }
            }
        }
    };
    HarvesterCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, Math.min(amount, this.resourceAmount(resourceType)));
    };
    HarvesterCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, Math.min(amount, this.emptyStorage()));
    };
    HarvesterCreepWrapper.prototype.resourceAmount = function (resourceType) {
        if (this.element.carry[resourceType] === undefined)
            return 0;
        else
            return this.element.carry[resourceType];
    };
    HarvesterCreepWrapper.prototype.emptyStorage = function () {
        var tot = 0;
        for (var rt in this.element.carry)
            tot += this.element.carry[tot];
        return tot;
    };
    return HarvesterCreepWrapper;
}());
exports.HarvesterCreepWrapper = HarvesterCreepWrapper;
function isFreeSpawn(sw) {
    var s = sw.element;
    if (s.structureType != STRUCTURE_SPAWN)
        return false;
    var ss = s;
    return ss.energy < ss.energyCapacity;
}
function isFreeContainer(sw) {
    var s = sw.element;
    if (s.structureType != STRUCTURE_CONTAINER)
        return false;
    var ss = s;
    return ss.store.energy < ss.storeCapacity;
}
function isFreeExtension(sw) {
    var s = sw.element;
    if (s.structureType != STRUCTURE_EXTENSION)
        return false;
    var ss = s;
    return ss.energy < ss.energyCapacity;
}
