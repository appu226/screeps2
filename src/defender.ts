import o = require('./option');

export function makeDefenderOrder(orderName: string, targetId: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_DEFENDER,
        name: `${pv.CREEP_TYPE_DEFENDER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [RANGED_ATTACK, MOVE, MOVE, TOUGH, TOUGH, TOUGH, TOUGH, TOUGH],
        addOnBody: [MOVE, RANGED_ATTACK, MOVE, HEAL],
        maxEnergy: 100000,
        memory: makeDefenderMemory(targetId, pv)
    };
}

function makeDefenderMemory(targetId: string, pv: Paraverse): DefenderMemory {
    return {
        targetId: targetId,
        creepType: pv.CREEP_TYPE_DEFENDER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface DefenderMemory extends CreepMemory {
    targetId: string;
}

export class DefenderCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: DefenderMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_DEFENDER;
        this.memory = <DefenderMemory>creep.memory;
        pv.recordDefense(creep, this.memory.targetId);
    }

    process(pv: Paraverse) {
        let defender = this.creep;
        let memory = this.memory;
        let enemy = pv.game.getObjectById<Creep>(memory.targetId);
        if (enemy != null && pv.getTotalCollectedDefense(memory.targetId) >= pv.getSoldierCapability(enemy) * .2)
            pv.moveCreep(this, enemy.pos);
        else {
            pv.avoidObstacle(this);
        }
        defender.rangedAttack(enemy);
    }
}

