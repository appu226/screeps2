import mopt = require('./option');
import mter = require('./terrain');

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
        totalEfficiency: 0
    }
}

interface HarvesterMemory extends CreepMemory {
    sourceId: string;
}

export class HarvesterCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: HarvesterMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = <HarvesterMemory>creep.memory;
    }

    roomHasTransporters(pv: Paraverse): boolean {
        return pv.getMyCreepsByRoomAndType(this.creep.room, pv.CREEP_TYPE_TRANSPORTER).length > 0;
    }

    process(pv: Paraverse) {
        if (this.creep.carryCapacity == 0) {
            pv.avoidObstacle(this);
            return;
        }
        if (this.creep.carry.energy < this.creep.carryCapacity) {
            let source = pv.game.getObjectById<Source>(this.memory.sourceId);
            if (source == null) {
                pv.pushEfficiency(this.memory, 0);
                return;
            }
            let harvestAttempt = this.creep.harvest(source);
            if (harvestAttempt == ERR_NOT_IN_RANGE) {
                pv.pushEfficiency(this.memory, 0);
                pv.moveCreep(this, source.pos);
            } else if (source.energy == 0) {
                pv.pushEfficiency(this.memory, 0)
            } else {
                pv.log.error(`Harevet attempt by ${this.creep.name} failed with error ${harvestAttempt}.`)
                pv.pushEfficiency(this.memory, 1);
            }
        } else {
            pv.pushEfficiency(this.memory, 0);
            let targets =
                pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_SPAWN).filter(
                    sw => isFreeSpawn(sw)
                ).concat(
                    pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_CONTAINER).filter(
                        sw => isFreeContainer(sw)
                    )).concat(
                    pv.getMyStructuresByRoomAndType(this.creep.room, STRUCTURE_EXTENSION).filter(
                        sw => isFreeExtension(sw)
                    ));

            let closest = mopt.maxBy<StructureWrapper>(
                targets,
                (sw: StructureWrapper) => -1 * mter.euclidean(sw.structure.pos, this.creep.pos, pv)
            );
            if (closest.isPresent) {
                let target = closest.get.elem;
                if (this.creep.transfer(target.structure, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, target.structure.pos);
                }
            }
        }
        pv.requestResourceSend(
            this.creep.room.name,
            this.creep.id,
            true,
            RESOURCE_ENERGY,
            this.creep.carry.energy
        );
    }
}

function isFreeSpawn(sw: StructureWrapper) {
    let s = sw.structure;
    if (s.structureType != STRUCTURE_SPAWN) return false;
    let ss = <StructureSpawn>s;
    return ss.energy < ss.energyCapacity;
}

function isFreeContainer(sw: StructureWrapper) {
    let s = sw.structure;
    if (s.structureType != STRUCTURE_CONTAINER) return false;
    let ss = <StructureContainer>s;
    return ss.store.energy < ss.storeCapacity;
}

function isFreeExtension(sw: StructureWrapper) {
    let s = sw.structure;
    if (s.structureType != STRUCTURE_EXTENSION) return false;
    let ss = <StructureExtension>s;
    return ss.energy < ss.energyCapacity;
}