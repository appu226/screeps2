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
        let enemy: (Creep | Structure) = pv.game.getObjectById<Creep>(memory.targetId);
        if (enemy == null) {
            let hostileCreeps = pv.getHostileCreepsInRoom(defender.room);
            if (hostileCreeps.length > 0) enemy = hostileCreeps[0];
        }
        if (enemy == null) {
            let hostileStructures: Structure[] = pv.getHostileStructuresInRoom(defender.room);
            if (hostileStructures.length > 0) enemy = hostileStructures[0];
        }
        let couldMove = pv.moveCreep(this, enemy.pos);
        let attackResult = defender.rangedAttack(enemy);
        pv.pushEfficiency(memory, couldMove || attackResult == OK ? 1 : 0);
        return;
    }
}

