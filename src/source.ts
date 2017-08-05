import o = require('./option');

class SourceWrapperImpl implements SourceWrapper {
    constructor(s: Source, pv: Paraverse) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    source: Source;
    memory: SourceMemory;
    process(pv: Paraverse): void {
        if (!isCloseToLair(this.source, this.memory, pv) || this.source.room.controller.level >= 4) {
            let allCreeps =
                pv.getMyCreeps() // search all creeps
                    .filter(cw => pv.isHarvesterWithSource(cw, this.source.id)); // that belong to this source
            if (allCreeps.length == 0 || o.sum(allCreeps.map(cw => pv.getEfficiency(cw.creep.memory))) / allCreeps.length > .9) {
                pv.scheduleCreep(this.source.room.name, pv.makeHarvesterOrder("Harvester_" + this.source.id, this.source.id), 5);
            }
        }
    }
}

export function makeSourceWrapper(s: Source, pv: Paraverse): SourceWrapper {
    return new SourceWrapperImpl(s, pv);
}

export function makeSourceMemory(source: Source, pv: Paraverse): SourceMemory {
    return {
        id: source.id,
        isCloseToLair: isCloseToLair(source, <SourceMemory>{}, pv)
    }
}

function isCloseToLair(source: Source, sourceMemory: SourceMemory, pv: Paraverse): boolean {
    if (sourceMemory.isCloseToLair === undefined)
        sourceMemory.isCloseToLair = source.pos.findInRange<Structure>(
            FIND_STRUCTURES, 10
        ).filter(
            (s: Structure) => s.structureType == STRUCTURE_KEEPER_LAIR
            ).length > 0;
    return sourceMemory.isCloseToLair;
}