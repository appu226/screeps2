import o = require('./option');

export function makeDefenderOrder(orderName: string, targetId: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_DEFENDER,
        name: `${pv.CREEP_TYPE_DEFENDER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, ATTACK, MOVE, ATTACK],
        addOnBody: [MOVE, ATTACK],
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
        totalEfficiency: 0,
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    }
}

interface DefenderMemory extends CreepMemory {
    targetId: string;
}

export class DefenderCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: DefenderMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_DEFENDER;
        this.memory = <DefenderMemory>creep.memory;
        this.resourceRequests = [];
        pv.recordDefense(creep, this.memory.targetId);
    }

    process(pv: Paraverse) {
        let defender = this.element;
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
        if (enemy == null) {
            pv.avoidObstacle(this);
            pv.pushEfficiency(memory, 0);
            return;
        }
        let couldMove = pv.moveCreep(this, enemy.pos);
        let attackResult = defender.attack(enemy);
        pv.pushEfficiency(memory, couldMove || attackResult == OK ? 1 : 0);
        return;
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
}

