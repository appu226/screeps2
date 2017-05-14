import mspawn = require('./spawn');
import mkeeperLair = require('./keeperLair');
import mcontroller = require('./controller');

export function makeStructureWrapper(structure: Structure, pv: Paraverse): StructureWrapper {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN:
            return mspawn.makeSpawnWrapper(<StructureSpawn>structure);
        case STRUCTURE_KEEPER_LAIR:
            return mkeeperLair.makeKeeperLairWrapper(<StructureKeeperLair>structure);
        case STRUCTURE_CONTROLLER:
            return mcontroller.makeControllerWrapper(<StructureController>structure);

        default: throw new Error(`makeStructureWrapper: type ${structure.structureType} not yet supported.`)
    }
}

export function structureTypeToCode(structureType: string, pv: Paraverse): number {
    throw new Error("structureTypeToCode not yet implemented.")
}