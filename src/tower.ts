import o = require('./option');
import mterrain = require('./terrain');

class TowerWrapper implements StructureWrapper {
    structure: StructureTower;
    my: boolean;

    constructor(tower: StructureTower) {
        this.structure = tower;
        this.my = tower.my;
    }

    process(pv: Paraverse): void {

        let t = this.structure;
        let closestAndWeakestFinder =
            function (c: Creep | Structure): number {
                return 1.0 / mterrain.euclidean(t.pos, c.pos, pv) / c.hits
            };

        pv.requestResourceReceive(t.room.name, t.id, false, RESOURCE_ENERGY, t.energyCapacity - t.energy);

        //attack closest and weakest enemy
        let enemies = pv.getHostileCreepsInRoom(t.room);
        let ce = //closest enemy
            o.maxBy<Creep>(enemies, closestAndWeakestFinder);
        if (ce.isPresent) {
            t.attack(ce.get.elem);
            return;
        }

        //heal closest and weakest creep
        let myCreeps = pv.getMyCreepsByRoom(t.room).map(cw => cw.creep).filter(c => c.hits < c.hitsMax);
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
            ).map(sw => sw.structure).filter(s => s.hits < s.hitsMax);
        let ss = o.maxBy<Structure>(structures, closestAndWeakestFinder);
        if (ss.isPresent) {
            t.repair(ss.get.elem);
        }
        return;
    }

}

export function makeTowerWrapper(tower: StructureTower): StructureWrapper {
    return new TowerWrapper(tower);
}