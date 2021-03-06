"use strict";
function makeUpgraderOrder(orderName, roomName, pv) {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: pv.CREEP_TYPE_UPGRADER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, CARRY, WORK],
        addOnBody: [MOVE, CARRY, CARRY, WORK],
        maxEnergy: 3000,
        memory: makeUpgraderMemory(roomName, pv)
    };
}
exports.makeUpgraderOrder = makeUpgraderOrder;
function makeUpgraderMemory(roomName, pv) {
    return {
        roomName: roomName,
        creepType: pv.CREEP_TYPE_UPGRADER,
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
var UpgraderCreepWrapper = (function () {
    function UpgraderCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = creep.memory;
        var energy = pv.resourceAmount(creep.carry, RESOURCE_ENERGY);
        var demand = creep.carryCapacity - energy;
        this.resourceRequests = demand > 0
            ? [{
                    roomName: creep.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: creep.id,
                    resourceRequestType: pv.PULL_REQUEST,
                    isBlocker: energy == 0
                }]
            : [];
    }
    UpgraderCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    UpgraderCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    UpgraderCreepWrapper.prototype.process = function (pv) {
        var roomName = this.memory.roomName;
        var room = Game.rooms[roomName];
        if (room === undefined) {
            pv.pushEfficiency(this.memory, 0);
            throw new Error(this.element.name + " could not find room " + roomName);
        }
        var creep = this.element;
        if (pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0 && room.storage) {
            var withdrawResult = creep.withdraw(room.storage, RESOURCE_ENERGY);
            switch (withdrawResult) {
                case OK: {
                    pv.pushEfficiency(this.memory, 1);
                    pv.avoidObstacle(this);
                    break;
                }
                case ERR_NOT_IN_RANGE: {
                    pv.pushEfficiency(this.memory, pv.moveCreep(this, room.storage.pos) ? 1 : 0);
                    break;
                }
                case ERR_NOT_ENOUGH_ENERGY: {
                    pv.pushEfficiency(this.memory, 0);
                    pv.avoidObstacle(this);
                    break;
                }
                default: {
                    pv.pushEfficiency(this.memory, 0);
                    pv.avoidObstacle(this);
                    throw new Error(creep.name + " withdrawing from storage of " + roomName + " failed with code " + withdrawResult + ".");
                }
            }
        }
        else {
            var controller = room.controller;
            var upgradeResult = creep.upgradeController(controller);
            switch (upgradeResult) {
                case OK: {
                    pv.pushEfficiency(this.memory, 1);
                    pv.avoidObstacle(this);
                    break;
                }
                case ERR_NOT_IN_RANGE: {
                    pv.pushEfficiency(this.memory, pv.moveCreep(this, controller.pos) ? 1 : 0);
                    break;
                }
                case ERR_NOT_ENOUGH_ENERGY: {
                    pv.pushEfficiency(this.memory, 0);
                    pv.avoidObstacle(this);
                    break;
                }
                default: {
                    pv.pushEfficiency(this.memory, 0);
                    pv.avoidObstacle(this);
                    throw new Error(creep.name + " upgrading " + roomName + " failed with code " + upgradeResult + ".");
                }
            }
        }
    };
    return UpgraderCreepWrapper;
}());
exports.UpgraderCreepWrapper = UpgraderCreepWrapper;
