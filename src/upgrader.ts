export function makeUpgraderOrder(orderName: string, roomName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: `${pv.CREEP_TYPE_UPGRADER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, CARRY, CARRY, WORK],
        addOnBody: [MOVE, MOVE, CARRY, WORK],
        maxEnergy: 3000,
        memory: makeUpgraderMemory(roomName, pv)
    }
}

function makeUpgraderMemory(roomName: string, pv: Paraverse): UpgraderMemory {
    return {
        roomName: roomName,
        creepType: pv.CREEP_TYPE_UPGRADER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface UpgraderMemory extends CreepMemory {
    roomName: string
}

export class UpgraderCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: UpgraderMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = <UpgraderMemory>creep.memory;
    }

    process(pv: Paraverse) {
        let roomName = this.memory.roomName;
        let room = Game.rooms[roomName];
        if (room === undefined) {
            pv.pushEfficiency(this.memory, 0);
            throw new Error(`${this.creep.name} could not find room ${roomName}`);
        }
        let creep = this.creep;
        let controller = room.controller;
        let upgradeResult = creep.upgradeController(controller);
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
                throw new Error(`${creep.name} upgrading ${roomName} failed with code ${upgradeResult}.`);
            }
        }
        pv.requestResourceReceive(
            this.creep.room.name,
            this.creep.id,
            true,
            RESOURCE_ENERGY,
            this.creep.carryCapacity - this.creep.carry.energy
        );
    }
}
