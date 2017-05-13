import mspawn = require('./spawn');

export function makeStructureWrapper(structure: Structure, pv: Paraverse): StructureWrapper {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN: {
            return mspawn.makeSpawnWrapper(<StructureSpawn>structure);
        }
        default: throw new Error(`makeStructureWrapper: type ${structure.structureType} not yet supported.`)
    }
}

export function structureTypeToCode(structureType: string, pv: Paraverse): number {
    throw new Error("structureTypeToCode not yet implemented.")
}