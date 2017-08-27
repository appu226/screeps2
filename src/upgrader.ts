export function makeUpgraderOrder(orderName: string, roomName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: `${pv.CREEP_TYPE_UPGRADER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [MOVE, CARRY, WORK, WORK],
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
    element: Creep;
    creepType: string;
    memory: UpgraderMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = <UpgraderMemory>creep.memory;
        this.resourceRequests = [];
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

    process(pv: Paraverse) {
        let roomName = this.memory.roomName;
        let room = Game.rooms[roomName];
        if (room === undefined) {
            pv.pushEfficiency(this.memory, 0);
            throw new Error(`${this.element.name} could not find room ${roomName}`);
        }
        let creep = this.element;
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
    }
}
