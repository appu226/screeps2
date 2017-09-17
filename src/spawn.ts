import mopt = require('./option');

class SpawnWrapper implements StructureWrapper {
    element: StructureSpawn;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(spawn: StructureSpawn, pv: Paraverse) {
        this.element = spawn;
        this.my = spawn.my;
        this.resourceRequests = [];
        let energyDemand = spawn.energyCapacity - spawn.energy;
        if (energyDemand > 0) {
            this.resourceRequests.push({
                requestorId: spawn.id,
                resourceType: RESOURCE_ENERGY,
                resourceRequestType: pv.PULL_REQUEST,
                amount: energyDemand,
                roomName: spawn.room.name,
                //isBlocker is used for checking if you need more transporters
                //spawn and extension energy becomes 0 suddenly rather than gradually
                //so you can't really use spawn or extension data to check if you need more transporters
                isBlocker: false
            });
        }
    }

    process(pv: Paraverse): void {
        if (!this.my) {
            pv.log.debug(`spawn.ts: Skipping spawn ${this.element.id}`)
            return;
        }
        let me = this.element;
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
                order.maxEnergy = avblEnergy;
                topOrder = mopt.Some<CreepOrder>(order);
            }
        }
        if (!topOrder.isPresent && avblEnergy >= 300 && pv.getMyCreepsByRoomAndType(me.room, pv.CREEP_TYPE_TRANSPORTER).length == 0) {
            let order = pv.makeTransporterOrder("emergencyTransporter");
            order.maxEnergy = avblEnergy;
            topOrder = mopt.Some<CreepOrder>(order);
        }

        if (!topOrder.isPresent) topOrder = orderQueue.peek();

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
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot take energy from Spawn.");
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, Math.min(amount, this.element.energyCapacity - this.element.energy));
    }
}

export function makeSpawnWrapper(spawn: StructureSpawn, pv: Paraverse): SpawnWrapper {
    return new SpawnWrapper(spawn, pv);
}