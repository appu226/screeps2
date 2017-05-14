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
    throw new Error("structureTypeToCode not yet implemented.");
}
exports.structureTypeToCode = structureTypeToCode;
