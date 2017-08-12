import o = require('./option');

class SourceWrapperImpl implements SourceWrapper {
    constructor(s: Source, pv: Paraverse) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    source: Source;
    memory: SourceMemory;
    process(pv: Paraverse): void {
        if (!pv.isCloseToLair(this.source, this.memory) || this.source.room.controller.level >= 4) {
            let allCreeps =
                pv.getMyCreeps() // search all creeps
                    .filter(cw => pv.isHarvesterWithSource(cw, this.source.id)); // that belong to this source
            let numCollectionSlots = getNumCollectionSlots(this.source, pv);
            let isCollectionSpotEmpty = allCreeps.length < numCollectionSlots;
            let fullButCreepAboutToDie = numCollectionSlots == allCreeps.length && allCreeps.filter(cw => cw.creep.ticksToLive < 100).length > 0;
            if (areSpawnsFree(this.source.room, pv) && (isCollectionSpotEmpty || fullButCreepAboutToDie)) {
                pv.scheduleCreep(this.source.room.name, pv.makeHarvesterOrder("Harvester_" + this.source.id, this.source.id), 5);
            }
        }
    }
}

function areSpawnsFree(room: Room, pv: Paraverse): boolean {
    return pv.getMyStructuresByRoomAndType(
        room,
        STRUCTURE_SPAWN
    ).filter((sw: StructureWrapper) =>
        (<StructureSpawn>sw.structure).spawning != null
        ).length == 0;
}

export function makeSourceWrapper(s: Source, pv: Paraverse): SourceWrapper {
    return new SourceWrapperImpl(s, pv);
}

export function makeSourceMemory(source: Source, pv: Paraverse): SourceMemory {
    return {
        id: source.id,
        isCloseToLair: pv.isCloseToLair(source, <SourceMemory>{}),
        containerId: "",
        numCollectionSlots: -1
    }
}

function getNumCollectionSlots(source: Source, pv: Paraverse): number {
    let mem = pv.getSourceMemory(source);
    if (mem.numCollectionSlots === undefined || mem.numCollectionSlots == -1) {
        let pcs = pv.getPossibleCollectionSites(source.room);
        let xs = [source.pos.x - 1, source.pos.x, source.pos.x + 1];
        let ys = [source.pos.y - 1, source.pos.y, source.pos.y + 1];
        let numCollectionSlots = 0;
        xs.forEach(x => {
            ys.forEach(y => {
                if (x >= 0 && x < pcs.length && y >= 0 && y < pcs[x].length && pcs[x][y])
                    numCollectionSlots++;
            })
        })
        mem.numCollectionSlots = numCollectionSlots;
    }
    return mem.numCollectionSlots;
}