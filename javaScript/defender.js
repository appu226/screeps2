"use strict";
function makeDefenderOrder(orderName, targetId, pv) {
    return {
        creepType: pv.CREEP_TYPE_DEFENDER,
        name: pv.CREEP_TYPE_DEFENDER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, ATTACK, MOVE, ATTACK],
        addOnBody: [MOVE, ATTACK],
        maxEnergy: 100000,
        memory: makeDefenderMemory(targetId, pv)
    };
}
exports.makeDefenderOrder = makeDefenderOrder;
function makeDefenderMemory(targetId, pv) {
    return {
        targetId: targetId,
        creepType: pv.CREEP_TYPE_DEFENDER,
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
var DefenderCreepWrapper = (function () {
    function DefenderCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_DEFENDER;
        this.memory = creep.memory;
        this.resourceRequests = [];
        pv.recordDefense(creep, this.memory.targetId);
    }
    DefenderCreepWrapper.prototype.process = function (pv) {
        var defender = this.element;
        var memory = this.memory;
        var enemy = pv.game.getObjectById(memory.targetId);
        if (enemy == null) {
            var hostileCreeps = pv.getHostileCreepsInRoom(defender.room);
            if (hostileCreeps.length > 0)
                enemy = hostileCreeps[0];
        }
        if (enemy == null) {
            var hostileStructures = pv.getHostileStructuresInRoom(defender.room);
            if (hostileStructures.length > 0)
                enemy = hostileStructures[0];
        }
        if (enemy == null) {
            pv.avoidObstacle(this);
            pv.pushEfficiency(memory, 0);
            return;
        }
        var couldMove = pv.moveCreep(this, enemy.pos);
        var attackResult = defender.attack(enemy);
        pv.pushEfficiency(memory, couldMove || attackResult == OK ? 1 : 0);
        return;
    };
    DefenderCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    DefenderCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return DefenderCreepWrapper;
}());
exports.DefenderCreepWrapper = DefenderCreepWrapper;
