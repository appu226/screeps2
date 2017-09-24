import o = require('./option');

export function makeClaimerOrder(orderName: string, roomName: string, roomPath: string[], pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_CLAIMER,
        name: `${pv.CREEP_TYPE_CLAIMER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CLAIM],
        addOnBody: [MOVE, MOVE, WORK, CARRY],
        maxEnergy: 100000,
        memory: makeClaimerMemory(roomName, roomPath, pv)
    };
}

function makeClaimerMemory(targetRoom: string, roomPath: string[], pv: Paraverse): ClaimerMemory {
    return {
        targetRoom: targetRoom,
        roomPath: roomPath,
        spawnConstructionSiteId: "",
        sourceId: "",
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

interface ClaimerMemory extends CreepMemory {
    targetRoom: string;
    roomPath: string[];
    spawnConstructionSiteId: string;
    sourceId: string;
}

export class ClaimerCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: ClaimerMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_CLAIMER;
        this.memory = <ClaimerMemory>creep.memory;
        this.resourceRequests = [];
    }

    process(pv: Paraverse) {
        let creep = this.element;
        let mem = this.memory;
        if (creep.room.name == mem.targetRoom) {
            let room = creep.room;
            if (!room.controller.my) {
                if (creep.claimController(room.controller) == ERR_NOT_IN_RANGE)
                    pv.moveCreep(this, room.controller.pos);
            } else if (room.controller.ticksToDowngrade < 1000) {
                let distanceToController = pv.manhattan(creep.pos, room.controller.pos);
                let source: Source = this.getSource(pv);
                let distanceToSource = pv.manhattan(creep.pos, source.pos);
                let controllerIsCloser = distanceToController < distanceToSource;
                let isEmpty = pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0;
                let isFull = pv.availableSpace(creep.carry, creep.carryCapacity) == 0;
                if (isEmpty || (!isFull && !controllerIsCloser)) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, source.pos);
                } else {
                    if (creep.upgradeController(room.controller) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, room.controller.pos);
                }
            } else if (pv.getMyStructuresByRoomAndType(room, STRUCTURE_SPAWN).length > 0) {
                return;
            } else if (pv.getConstructionSitesFromRoomOfType(room, STRUCTURE_SPAWN).length == 0) {
                pv.constructNextSite(room, STRUCTURE_SPAWN);
            } else {
                let cs = pv.getConstructionSitesFromRoomOfType(room, STRUCTURE_SPAWN)[0];
                let distanceToCs = pv.manhattan(creep.pos, cs.pos);
                let source: Source = this.getSource(pv);
                let distanceToSource = pv.manhattan(creep.pos, source.pos);
                let isEmpty = pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0;
                let isFull = pv.availableSpace(creep.carry, creep.carryCapacity) == 0;
                let sourceIsCloser = distanceToSource < distanceToCs;
                if (isEmpty || (!isFull && sourceIsCloser)) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, source.pos);
                } else {
                    if (creep.build(cs) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, cs.pos);
                }
            }

        } else {
            let nextRoom = ""
            for (let i = 1; i < mem.roomPath.length; ++i)
                if (mem.roomPath[i - 1] == creep.room.name) nextRoom = mem.roomPath[i];
            if (nextRoom == "")
                throw new Error(`claimer/ClaimerCreepWrapper.process: Creep ${creep.name} does not know which room to go to after ${creep.room.name}`);
            let exits = pv.map.describeExits(creep.room.name);
            if (exits[nextRoom] === undefined)
                throw new Error(`claimer/ClaimerCreepWrpper.process: Could not find exit to ${nextRoom} from ${creep.room.name}`);
            creep.moveTo(<RoomPosition>creep.pos.findClosestByRange(exits[nextRoom]));
        }
    }

    getSource(pv: Paraverse): Source {
        let src = pv.game.getObjectById<Source>(this.memory.sourceId);
        if (src == null) {
            let closest = this.element.pos.findClosestByRange<Source>(FIND_SOURCES_ACTIVE);
            this.memory.sourceId = closest.id;
            return closest;
        }
        return src;
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
}

