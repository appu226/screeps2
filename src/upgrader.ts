export function makeUpgraderOrder(orderName: string, roomName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: `${pv.CREEP_TYPE_UPGRADER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, CARRY, WORK],
        addOnBody: [MOVE, CARRY, CARRY, WORK],
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
        totalEfficiency: 0,
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
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
        let energy = pv.resourceAmount(creep.carry, RESOURCE_ENERGY);
        let demand = creep.carryCapacity - energy;
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
        if (pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0 && room.storage) {
            let withdrawResult = creep.withdraw(room.storage, RESOURCE_ENERGY);
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
                    throw new Error(`${creep.name} withdrawing from storage of ${roomName} failed with code ${withdrawResult}.`);
                }
            }
        } else {
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
}
