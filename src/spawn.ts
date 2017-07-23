class SpawnWrapper implements StructureWrapper {
    structure: StructureSpawn;
    my: boolean;

    constructor(spawn: StructureSpawn) {
        this.structure = spawn;
        this.my = spawn.my;
    }

    process(pv: Paraverse): void {
        if (!this.my) {
            pv.log.debug(`spawn.ts: Skipping spawn ${this.structure.id}`)
            return;
        }
        let me = this.structure;
        let orderQueue: PQ<CreepOrder> = pv.getCreepOrders(me.room.name);
        
        let memory = pv.getSpawnMemory(me);
        let avblEnergy = me.room.energyAvailable;
        if (avblEnergy == memory.lastTickEnergy) {
            ++memory.ticksSinceLastDonation;
        }
        memory.lastTickEnergy = avblEnergy;

        let topOrder = orderQueue.peek();
        if (topOrder.isPresent) {
            let order = topOrder.get;
            let minEnergy = order.basicBody.map(bp => BODYPART_COST[bp]).reduce<number>((p, c) => p + c, 0);
            let maxEnergy = me.room.energyCapacityAvailable;
            //console.log("minEnergy, maxEnergy, avblEnergy, ticksSinceLastDonation = ", minEnergy, maxEnergy, avblEnergy, memory.ticksSinceLastDonation);
            if (avblEnergy >= minEnergy && (avblEnergy == maxEnergy || memory.ticksSinceLastDonation >= 20)) {
                for (
                    let x = 0;
                    minEnergy + BODYPART_COST[order.addOnBody[x]] <= Math.min(order.maxEnergy, avblEnergy);
                    x = (x + 1) % order.addOnBody.length
                ) {
                    order.basicBody.push(order.addOnBody[x]);
                    minEnergy += BODYPART_COST[order.addOnBody[x]];
                }
                order.basicBody.sort((lbp, rbp) =>
                    pv.bodyPartPriority[lbp] - pv.bodyPartPriority[rbp]
                );
                pv.log.debug(`Spawn ${me.id} scheduling ${order.basicBody} for cost ${minEnergy}`)
                let result = me.createCreep(order.basicBody, order.name, order.memory);
                pv.log.debug(`with result ${result}`);
            }
        }

        pv.requestResourceReceive(
            this.structure.room.name,
            this.structure.id,
            false,
            RESOURCE_ENERGY,
            this.structure.energyCapacity - this.structure.energy
        );
    }
}

export function makeSpawnWrapper(spawn: StructureSpawn): SpawnWrapper {
    return new SpawnWrapper(spawn);
}