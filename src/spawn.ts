import mopt = require('./option');

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

        let topOrder = mopt.None<CreepOrder>();
        if (avblEnergy >= 300 && pv.getMyCreepsByRoomAndType(me.room, pv.CREEP_TYPE_HARVESTER).length == 0) {
            let sources = pv.getMySources().filter(sw => sw.source.room.name == me.room.name);
            if (sources.length > 0) {
                let source = sources[0].source;
                let order = pv.makeHarvesterOrder("emergencyHarvester", source.id);
                topOrder = mopt.Some<CreepOrder>(order);
            }
        }

        if(!topOrder.isPresent) topOrder = orderQueue.peek();
        
        if (topOrder.isPresent && me.spawning == null) {
            let order = topOrder.get;
            let minEnergy = order.basicBody.map(bp => BODYPART_COST[bp]).reduce<number>((p, c) => p + c, 0);
            let maxEnergy = Math.min(me.room.energyCapacityAvailable, order.maxEnergy);
            //console.log("minEnergy, maxEnergy, avblEnergy, ticksSinceLastDonation = ", minEnergy, maxEnergy, avblEnergy, memory.ticksSinceLastDonation);
            if (avblEnergy >= minEnergy && avblEnergy >= maxEnergy) {
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