"use strict";
var mspawn = require("./spawn");
var mkeeperLair = require("./keeperLair");
var mcontroller = require("./controller");
function makeStructureWrapper(structure, pv) {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN:
            return mspawn.makeSpawnWrapper(structure);
        case STRUCTURE_KEEPER_LAIR:
            return mkeeperLair.makeKeeperLairWrapper(structure);
        case STRUCTURE_CONTROLLER:
            return mcontroller.makeControllerWrapper(structure);
        default: throw new Error("makeStructureWrapper: type " + structure.structureType + " not yet supported.");
    }
}
exports.makeStructureWrapper = makeStructureWrapper;
function structureTypeToCode(structureType, pv) {
    switch (structureType) {
        case STRUCTURE_ROAD: return pv.STRUCTURE_CODE_ROAD;
        case STRUCTURE_SPAWN: return pv.STRUCTURE_CODE_SPAWN;
        case STRUCTURE_RAMPART: return pv.STRUCTURE_CODE_RAMPART;
        case STRUCTURE_WALL: return pv.STRUCTURE_CODE_CWALL;
        case STRUCTURE_TOWER: return pv.STRUCTURE_CODE_TOWER;
        case STRUCTURE_EXTENSION: return pv.STRUCTURE_CODE_EXTENSION;
        case STRUCTURE_KEEPER_LAIR: return pv.STRUCTURE_CODE_KEEPER_LAIR;
        case STRUCTURE_CONTROLLER: return pv.STRUCTURE_CODE_CONTROLLER;
        default: throw new Error("structureTypeToCode: type " + structureType + " not yet supported.");
    }
}
exports.structureTypeToCode = structureTypeToCode;
