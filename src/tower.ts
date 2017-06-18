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
            function (c: Creep): number {
                return 1.0 / mterrain.euclidean(t.pos, c.pos, pv) / c.hits
            };

        pv.requestResourceReceive(t.room.name, t.id, false, RESOURCE_ENERGY, t.energyCapacity - t.energy);

        //attack closest and weakest enemy
        let enemies = pv.getHostileCreeps(t.room);
        let ce = //closest enemy
            o.maxBy<Creep>(enemies, closestAndWeakestFinder);
        if (ce.isPresent) {
            t.attack(ce.get.elem);
            return;
        }

        //heal closest and weakest creep
        let myCreeps = pv.getMyCreeps().map(cw => cw.creep).filter(c => c.room.name == t.room.name);
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

        let mem = pv.getTowerMemory(t.id);
        let target = pv.game.getObjectById<Structure>(mem.target);
        if (target === undefined || target == null) mem.status = "free";
        if (mem.status == "free") this.resetMemStatus(mem, pv);
        switch (mem.status) {
            case "free": break;
            case "other":
                this.repairOther(mem, pv);
                break;
            case "wall":
                this.repairWallOrRampart(mem, pv);
                break;
            case "rampart":
                this.repairWallOrRampart(mem, pv);
                break;
            default: break;
        }
        return;
    }

    repairOther(mem: TowerMemory, pv: Paraverse): void {
        let t = this.structure;
        let target = pv.game.getObjectById<Structure>(mem.target);
        if (target === undefined || target == null || target.hits == target.hitsMax) {
            pv.log.debug(`tower/repairOther: setting tower ${t.id} status to free.`)
            mem.status = "free";
            return;
        }
        t.repair(target);
    }

    repairWallOrRampart(mem: TowerMemory, pv: Paraverse): void {
        let t = this.structure;
        let hitPoints = pv.getWallHitPoints(t.room);
        let target = pv.game.getObjectById<Structure>(mem.target);
        if (target === undefined || target == null || target.hits == target.hitsMax || target.hits >= hitPoints) {
            pv.log.debug(`tower/repairWallOrRampart: setting tower ${t.id} status to free.`);
            mem.status = "free";
            return;
        }
        t.repair(target);
    }

    resetMemStatus(mem: TowerMemory, pv: Paraverse): void {
        let t = this.structure;
        let str = partitionStructures(t.room, pv);
        let wallHitPoints: number = pv.getWallHitPoints(t.room);
        let reset = this.findWeakestStructure(str.ramparts, wallHitPoints, "rampart", mem) ||
            this.findWeakestStructure(str.walls, wallHitPoints, "wall", mem) ||
            this.findWeakestStructure(str.roads, 1000000000, "other", mem) ||
            this.findWeakestStructure(str.others, 1000000000, "other", mem);
        // if all is well, set the bar higher for wall/rampart health
        if (!reset && t.room.controller.level >= 2) {
            pv.setWallHitPoints(t.room, Math.min(wallHitPoints + 1000, RAMPART_HITS_MAX[t.room.controller.level]));
        }

        if (reset)
            pv.log.debug(`tower/resetMemStatus: setting tower ${t.id} status to ${mem.status}.`)
    }

    findWeakestStructure(str: Structure[], hitPoints: number, status: string, mem: TowerMemory): boolean {
        let weakest = o.maxBy<Structure>(str, (s: Structure) => s.hits * -1);
        if (weakest.isPresent && weakest.get.elem.hits < weakest.get.elem.hitsMax && weakest.get.elem.hits < hitPoints) {
            mem.status = status;
            mem.target = weakest.get.elem.id;
            return true;
        }
        return false;
    }


}

function partitionStructures(room: Room, pv: Paraverse): StructurePartition {
    let str = pv.getMyStructures();
    let res: StructurePartition = {
        walls: [],
        ramparts: [],
        roads: [],
        others: []
    };
    for (let i = 0; i < str.length; ++i) {
        let sw = str[i];
        if (!sw.my) continue;
        switch (sw.structure.structureType) {
            case STRUCTURE_WALL:
                res.walls.push(sw.structure);
                break;
            case STRUCTURE_ROAD:
                res.roads.push(sw.structure);
                break;
            case STRUCTURE_RAMPART:
                res.ramparts.push(sw.structure);
                break;
            default:
                res.others.push(sw.structure);
                break;
        }
    }
    return res;
}

interface StructurePartition {
    walls: Structure[];
    ramparts: Structure[];
    roads: Structure[];
    others: Structure[];
}

export function makeTowerWrapper(tower: StructureTower): StructureWrapper {
    return new TowerWrapper(tower);
}