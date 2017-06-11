import o = require('./option');

class SourceWrapperImpl implements SourceWrapper {
    constructor(s: Source, pv: Paraverse) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    source: Source;
    memory: SourceMemory;
    process(pv: Paraverse): void {
        let allCreeps =
            pv.getMyCreeps() // search all creeps
                .filter(cw => pv.isHarvesterWithSource(cw, this.source.id)); // that belong to this source
        if (allCreeps.length == 0) {
            pv.scheduleCreep(this.source.room.name, "Harvester_" + this.source.id, pv.CREEP_TYPE_HARVESTER, 5);
        }
    }
}

export function makeSourceWrapper(s: Source, pv: Paraverse): SourceWrapper {
    return new SourceWrapperImpl(s, pv);
}

export function makeSourceMemory(source: Source, pv: Paraverse): SourceMemory {
    return {
        id: source.id
    };
}