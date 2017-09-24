import mopt = require('./option');

export function isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string, pv: Paraverse): boolean {
    return creepWrapper.creepType == pv.CREEP_TYPE_HARVESTER &&
        (<HarvesterCreepWrapper>creepWrapper).memory.sourceId == sourceId;
}


export function makeHarvesterOrder(orderName: string, sourceId: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_HARVESTER,
        name: `${pv.CREEP_TYPE_HARVESTER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [WORK, CARRY, WORK],
        maxEnergy: 1550,
        memory: makeHarvesterMemory(sourceId, pv)
    };
}

function makeHarvesterMemory(sourceId: string, pv: Paraverse): HarvesterMemory {
    return {
        sourceId: sourceId,
        creepType: pv.CREEP_TYPE_HARVESTER,
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

interface HarvesterMemory extends CreepMemory {
    sourceId: string;
}

export class HarvesterCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: HarvesterMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = <HarvesterMemory>creep.memory;
        let demand = pv.resourceAmount(creep.carry, RESOURCE_ENERGY);
        this.resourceRequests = demand > 0
            ? [{
                roomName: creep.room.name,
                resourceType: RESOURCE_ENERGY,
                amount: demand,
                requestorId: creep.id,
                resourceRequestType: pv.PUSH_REQUEST,
                isBlocker: pv.availableSpace(creep.carry, creep.carryCapacity) == 0
            }]
            : [];
    }

    roomHasTransporters(pv: Paraverse): boolean {
        return pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_TRANSPORTER).length > 0;
    }

    process(pv: Paraverse) {
        if (this.element.carryCapacity == 0) {
            pv.avoidObstacle(this);
            return;
        }
        if (this.element.carry.energy < this.element.carryCapacity) {
            let source = pv.game.getObjectById<Source>(this.memory.sourceId);
            if (source == null) {
                pv.pushEfficiency(this.memory, 0);
                return;
            }
            let harvestAttempt = this.element.harvest(source);
            if (harvestAttempt == ERR_NOT_IN_RANGE) {
                pv.pushEfficiency(this.memory, 0);
                pv.moveCreep(this, source.pos);
            } else if (source.energy == 0) {
                pv.pushEfficiency(this.memory, 0)
            } else {
                pv.log.error(`Harevet attempt by ${this.element.name} failed with error ${harvestAttempt}.`)
                pv.pushEfficiency(this.memory, 1);
            }
        } else {
            pv.pushEfficiency(this.memory, 0);
            let targets =
                pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_SPAWN).filter(
                    sw => isFreeSpawn(sw)
                ).concat(
                    pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_CONTAINER).filter(
                        sw => isFreeContainer(sw)
                    )).concat(
                    pv.getMyStructuresByRoomAndType(this.element.room, STRUCTURE_EXTENSION).filter(
                        sw => isFreeExtension(sw)
                    ));

            let closest = mopt.maxBy<StructureWrapper>(
                targets,
                (sw: StructureWrapper) => -1 * pv.manhattan(sw.element.pos, this.element.pos)
            );
            if (closest.isPresent
                && ( // don't go too far if there are transporters
                    pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_TRANSPORTER).length == 0
                    || closest.get.measure * -1 < 5
                )) {
                let target = closest.get.elem;
                if (this.element.transfer(target.element, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, target.element.pos);
                }
            }
        }
    }
    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, Math.min(amount, this.resourceAmount(resourceType)));
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, Math.min(amount, this.emptyStorage()));
    }

    resourceAmount(resourceType: string): number {
        if (this.element.carry[resourceType] === undefined) return 0;
        else return this.element.carry[resourceType];
    }
    emptyStorage(): number {
        let tot = 0;
        for (let rt in this.element.carry)
            tot += this.element.carry[tot];
        return tot;
    }
}

function isFreeSpawn(sw: StructureWrapper) {
    let s = sw.element;
    if (s.structureType != STRUCTURE_SPAWN) return false;
    let ss = <StructureSpawn>s;
    return ss.energy < ss.energyCapacity;
}

function isFreeContainer(sw: StructureWrapper) {
    let s = sw.element;
    if (s.structureType != STRUCTURE_CONTAINER) return false;
    let ss = <StructureContainer>s;
    return ss.store.energy < ss.storeCapacity;
}

function isFreeExtension(sw: StructureWrapper) {
    let s = sw.element;
    if (s.structureType != STRUCTURE_EXTENSION) return false;
    let ss = <StructureExtension>s;
    return ss.energy < ss.energyCapacity;
}