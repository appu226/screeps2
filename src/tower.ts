import o = require('./option');

class TowerWrapper implements StructureWrapper {
    element: StructureTower;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(tower: StructureTower, pv: Paraverse) {
        this.element = tower;
        this.my = tower.my;
        let demand = tower.energyCapacity - tower.energy;
        this.resourceRequests = demand > 0
            ? [{
                roomName: tower.room.name,
                resourceType: RESOURCE_ENERGY,
                amount: demand,
                requestorId: tower.id,
                resourceRequestType: pv.PULL_REQUEST,
                isBlocker: tower.energy == 0
            }]
            : [];
    }

    process(pv: Paraverse): void {

        let t = this.element;
        let closestAndWeakestFinder =
            function (c: Creep | Structure): number {
                return 1.0 / pv.euclidean(t.pos, c.pos) / c.hits
            };

        //attack closest and weakest enemy
        let enemies = pv.getHostileCreepsInRoom(t.room);
        let ce = //closest enemy
            o.maxBy<Creep>(enemies, closestAndWeakestFinder);
        if (ce.isPresent) {
            t.attack(ce.get.elem);
            return;
        }

        //heal closest and weakest creep
        let myCreeps = pv.getMyCreepsByRoom(t.room).map(cw => cw.element).filter(c => c.hits < c.hitsMax);
        let cc = //closest creep
            o.maxBy<Creep>(myCreeps, closestAndWeakestFinder);
        if (cc.isPresent) {
            t.heal(cc.get.elem);
            return;
        }

        // reserve 75% energy for attacking/healing
        let fullNess = t.energy / t.energyCapacity;
        if (fullNess < .75)
            return;

        let structures =
            pv.getMyStructuresByRoom(
                t.room
            ).map(sw => sw.element).filter(s => s.hitsMax - s.hits >= 800);
        let ss = o.maxBy<Structure>(structures, (s: Structure) => -s.hits);
        if (ss.isPresent) {
            t.repair(ss.get.elem);
        }
        return;
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot take energy from Tower.");
    }

    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

}

export function makeTowerWrapper(tower: StructureTower, pv: Paraverse): StructureWrapper {
    return new TowerWrapper(tower, pv);
}