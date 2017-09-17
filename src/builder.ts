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
        totalEfficiency: 0,
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    }
}

interface BuilderMemory extends CreepMemory {
    constructionSiteId: Option<string>
}

export class BuilderCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: BuilderMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_BUILDER;
        this.memory = <BuilderMemory>creep.memory;
        let demand = pv.availableSpace(creep.carry, creep.carryCapacity);
        this.resourceRequests =
            (demand > 0
                ? [{
                    roomName: this.element.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: this.element.id,
                    resourceRequestType: pv.PULL_REQUEST,
                    isBlocker: (pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0)
                }]
                : []);
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

    process(pv: Paraverse) {
        let cs: ConstructionSite = null;

        if (this.memory.constructionSiteId !== undefined && this.memory.constructionSiteId.isPresent) {
            cs = pv.game.getObjectById<ConstructionSite>(this.memory.constructionSiteId.get);
        }

        if (cs == null) {
            let constructionSites = pv.getConstructionSitesFromRoom(this.element.room);
            if (constructionSites.length > 0) {
                cs = constructionSites[0];
            }
        }
        if (cs != null) {
            let buildAttempt = this.element.build(cs);
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
    }
}

