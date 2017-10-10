"use strict";
function makeRemoteMinerOrder(orderName, sourceId, collectionRoom, deliveryRoom, pv) {
    return {
        creepType: pv.CREEP_TYPE_REMOTE_MINER,
        name: pv.CREEP_TYPE_REMOTE_MINER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, MOVE, WORK],
        addOnBody: [MOVE, CARRY, MOVE, WORK],
        maxEnergy: 10000,
        memory: makeRemoteMinerMemory(sourceId, collectionRoom, deliveryRoom, pv)
    };
}
exports.makeRemoteMinerOrder = makeRemoteMinerOrder;
function makeRemoteMinerMemory(sourceId, collectionRoom, deliveryRoom, pv) {
    return {
        sourceId: sourceId,
        collectionRoom: collectionRoom,
        deliveryRoom: deliveryRoom,
        isCollecting: true,
        creepType: pv.CREEP_TYPE_REMOTE_MINER,
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
var RemoteMinerCreepWrapper = (function () {
    function RemoteMinerCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_REMOTE_MINER;
        this.memory = creep.memory;
        this.resourceRequests = [];
    }
    RemoteMinerCreepWrapper.prototype.process = function (pv) {
        var c = this.element;
        var mem = this.memory;
        var source = pv.game.getObjectById(mem.sourceId);
        var isSourceEmpty = (source !== undefined && source != null && source.energy == 0);
        if (pv.availableSpace(c.carry, c.carryCapacity) == 0 || isSourceEmpty) {
            mem.isCollecting = false;
        }
        else if (pv.resourceAmount(c.carry, RESOURCE_ENERGY) == 0) {
            mem.isCollecting = true;
        }
        pv.log(["remoteMiner.process", "debug"], function () { return "processing remoteMiner " + c.name + " for " + (mem.isCollecting ? "collection" : "delivery"); });
        if (!mem.isCollecting) {
            //try to deliver
            var deliveryRoom = pv.game.rooms[mem.deliveryRoom];
            if (deliveryRoom === undefined)
                throw new Error("RemoteMiner " + c.name + " unable to locate delivery room " + mem.deliveryRoom);
            if (deliveryRoom.storage) {
                if (c.transfer(deliveryRoom.storage, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, deliveryRoom.storage.pos);
                }
                else {
                    pv.avoidObstacle(this);
                }
            }
            else {
                if (c.upgradeController(deliveryRoom.controller) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, deliveryRoom.controller.pos);
                }
                else {
                    pv.avoidObstacle(this);
                }
            }
        }
        else {
            if (c.room.name == mem.collectionRoom) {
                if (source === undefined || source == null)
                    throw new Error("RemoteMiner " + c.name + " cannot collect from source " + mem.sourceId + " because it cannot be found.");
                if (source.energy == 0)
                    throw new Error("RemoteMiner " + c.name + ".process : Illegal state ");
                var harvestResult = c.harvest(source);
                if (harvestResult == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, source.pos);
                }
                else if (harvestResult != OK) {
                    pv.avoidObstacle(this);
                }
            }
            else {
                var sourcePos = null;
                if (pv.game.flags[mem.sourceId] !== undefined)
                    sourcePos = pv.game.flags[mem.sourceId].pos;
                else
                    sourcePos = new RoomPosition(25, 25, mem.collectionRoom);
                ;
                pv.moveCreep(this, sourcePos);
            }
        }
    };
    RemoteMinerCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("remoteMiner cannot give resource to creep.");
    };
    RemoteMinerCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("remoteMiner cannot take resource from creep.");
    };
    return RemoteMinerCreepWrapper;
}());
exports.RemoteMinerCreepWrapper = RemoteMinerCreepWrapper;
function getSourceIdIfRemoteMiner(creepWrapper, pv) {
    if (creepWrapper.creepType == pv.CREEP_TYPE_REMOTE_MINER) {
        return creepWrapper.memory.sourceId;
    }
    else {
        return "";
    }
}
exports.getSourceIdIfRemoteMiner = getSourceIdIfRemoteMiner;
