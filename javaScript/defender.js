"use strict";
function makeDefenderOrder(orderName, targetId, pv) {
    return {
        creepType: pv.CREEP_TYPE_DEFENDER,
        name: pv.CREEP_TYPE_DEFENDER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [RANGED_ATTACK, MOVE, MOVE, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH],
        addOnBody: [MOVE, RANGED_ATTACK, MOVE, HEAL],
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
        totalEfficiency: 0
    };
}
var DefenderCreepWrapper = (function () {
    function DefenderCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_DEFENDER;
        this.memory = creep.memory;
        pv.recordDefense(creep, this.memory.targetId);
    }
    DefenderCreepWrapper.prototype.process = function (pv) {
        var defender = this.creep;
        var memory = this.memory;
        var enemy = pv.game.getObjectById(memory.targetId);
        if (enemy != null && pv.getTotalCollectedDefense(memory.targetId) >= pv.getSoldierCapability(enemy) * .2)
            pv.moveCreep(this, enemy.pos);
        else {
            pv.avoidObstacle(this);
        }
        defender.rangedAttack(enemy);
    };
    return DefenderCreepWrapper;
}());
exports.DefenderCreepWrapper = DefenderCreepWrapper;
