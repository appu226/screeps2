"use strict";
var mspawn = require("./spawn");
function makeStructureWrapper(structure, pv) {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN: {
            return mspawn.makeSpawnWrapper(structure);
        }
        default: throw new Error("makeStructureWrapper: type " + structure.structureType + " not yet supported.");
    }
}
exports.makeStructureWrapper = makeStructureWrapper;
function structureTypeToCode(structureType, pv) {
    throw new Error("structureTypeToCode not yet implemented.");
}
exports.structureTypeToCode = structureTypeToCode;
