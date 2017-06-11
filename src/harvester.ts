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
        addOnBody: [CARRY, WORK, WORK],
        maxEnergy: 1000,
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
        return pv.getMyCreeps().filter(
            cw =>
                cw.creepType == pv.CREEP_TYPE_TRANSPORTER &&
                cw.creep.room.name == this.creep.room.name
        ).length > 0;
    }

    process(pv: Paraverse) {
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
                pv.pushEfficiency(this.memory, 1);
            }
        } else {
            pv.pushEfficiency(this.memory, 0);
            if (!this.roomHasTransporters(pv)) {
                let spawns =
                    pv.getMyStructures().filter(
                        sw =>
                            sw.structure.structureType == STRUCTURE_SPAWN &&
                            sw.structure.room.name == this.creep.room.name
                    );
                if (spawns.length > 0) {
                    let spawn = spawns[0].structure;
                    if (this.creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        pv.moveCreep(this, spawn.pos);
                    }
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