import mspawn = require('./spawn');
import mextension = require('./extension');
import mcontroller = require('./controller');
import mkeeperLair = require('./keeperLair');
import mrampart = require('./rampart');
import mroad = require('./road');
import mtower = require('./tower');
import mwall = require('./wall');

export function makeStructureWrapper(structure: Structure, pv: Paraverse): StructureWrapper {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN:
            return mspawn.makeSpawnWrapper(<StructureSpawn>structure);
        case STRUCTURE_KEEPER_LAIR:
            return mkeeperLair.makeKeeperLairWrapper(<StructureKeeperLair>structure);
        case STRUCTURE_CONTROLLER:
            return mcontroller.makeControllerWrapper(<StructureController>structure);
        case STRUCTURE_ROAD:
            return mroad.makeRoadWrapper(<StructureRoad>structure);
        case STRUCTURE_RAMPART:
            return mrampart.makeRampartWrapper(<StructureRampart>structure, pv);
        case STRUCTURE_TOWER:
            return mtower.makeTowerWrapper(<StructureTower>structure);
        case STRUCTURE_EXTENSION:
            return mextension.makeExtensionWrapper(<StructureExtension>structure);
        case STRUCTURE_WALL:
            return mwall.makeWallWrapper(<StructureWall>structure, pv);
        default: throw new Error(`makeStructureWrapper: type ${structure.structureType} not yet supported.`)
    }
}

export function structureTypeToCode(structureType: string, pv: Paraverse): number {
    switch(structureType) {
        case STRUCTURE_ROAD: return pv.STRUCTURE_CODE_ROAD;
        case STRUCTURE_SPAWN: return pv.STRUCTURE_CODE_SPAWN;
        case STRUCTURE_RAMPART: return pv.STRUCTURE_CODE_RAMPART;
        case STRUCTURE_WALL: return pv.STRUCTURE_CODE_CWALL;
        case STRUCTURE_TOWER: return pv.STRUCTURE_CODE_TOWER;
        case STRUCTURE_EXTENSION: return pv.STRUCTURE_CODE_EXTENSION;
        case STRUCTURE_KEEPER_LAIR: return pv.STRUCTURE_CODE_KEEPER_LAIR;
        case STRUCTURE_CONTROLLER: return pv.STRUCTURE_CODE_CONTROLLER;
        default: throw new Error(`structureTypeToCode: type ${structureType} not yet supported.`);
    }
}