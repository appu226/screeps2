"use strict";
function makeUpgraderOrder(orderName, roomName, pv) {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: pv.CREEP_TYPE_UPGRADER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [MOVE, CARRY, WORK, WORK],
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
        totalEfficiency: 0
    };
}
var UpgraderCreepWrapper = (function () {
    function UpgraderCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = creep.memory;
    }
    UpgraderCreepWrapper.prototype.process = function (pv) {
        var roomName = this.memory.roomName;
        var room = Game.rooms[roomName];
        if (room === undefined) {
            pv.pushEfficiency(this.memory, 0);
            throw new Error(this.creep.name + " could not find room " + roomName);
        }
        var creep = this.creep;
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
    };
    return UpgraderCreepWrapper;
}());
exports.UpgraderCreepWrapper = UpgraderCreepWrapper;
