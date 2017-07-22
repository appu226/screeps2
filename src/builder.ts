import o = require('./option');

export function makeBuilderOrder(orderName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_BUILDER,
        name: `${pv.CREEP_TYPE_BUILDER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, CARRY, CARRY],
        addOnBody: [MOVE, CARRY, WORK, CARRY],
        maxEnergy: 1000,
        memory: makeBuilderMemory(pv)
    };
}

function makeBuilderMemory(pv: Paraverse): BuilderMemory {
    return {
        constructionSiteId: o.None<string>(),
        creepType: pv.CREEP_TYPE_BUILDER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface BuilderMemory extends CreepMemory {
    constructionSiteId: Option<string>
}

export class BuilderCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: BuilderMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_BUILDER;
        this.memory = <BuilderMemory>creep.memory;
    }

    process(pv: Paraverse) {
        let cs: ConstructionSite = null;

        if (this.memory.constructionSiteId !== undefined && this.memory.constructionSiteId.isPresent) {
            cs = pv.game.getObjectById<ConstructionSite>(this.memory.constructionSiteId.get);
        }

        if (cs == null) {
            let constructionSites = pv.getConstructionSitesFromRoom(this.creep.room);
            if (constructionSites.length > 0) {
                cs = constructionSites[0];
            }
        }
        if (cs != null) {
            let buildAttempt = this.creep.build(cs);
            if (buildAttempt == ERR_NOT_IN_RANGE) {
                pv.moveCreep(this, cs.pos);
                pv.pushEfficiency(this.memory, 0);
            } else if (buildAttempt == OK) {
                pv.avoidObstacle(this);
                pv.pushEfficiency(this.memory, 1);
            } else {
                pv.avoidObstacle(this);
                pv.pushEfficiency(this.memory, 0);
            }
            this.memory.constructionSiteId = o.Some<string>(cs.id);
        } else {
            pv.avoidObstacle(this);
            pv.pushEfficiency(this.memory, 0);
            this.memory.constructionSiteId = o.None<string>();
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

