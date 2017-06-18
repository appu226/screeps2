"use strict";
var mspawn = require("./spawn");
var mextension = require("./extension");
var mcontroller = require("./controller");
var mkeeperLair = require("./keeperLair");
var mrampart = require("./rampart");
var mroad = require("./road");
var mtower = require("./tower");
var mwall = require("./wall");
function makeStructureWrapper(structure, pv) {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN:
            return mspawn.makeSpawnWrapper(structure);
        case STRUCTURE_KEEPER_LAIR:
            return mkeeperLair.makeKeeperLairWrapper(structure);
        case STRUCTURE_CONTROLLER:
            return mcontroller.makeControllerWrapper(structure);
        case STRUCTURE_ROAD:
            return mroad.makeRoadWrapper(structure);
        case STRUCTURE_RAMPART:
            return mrampart.makeRampartWrapper(structure, pv);
        case STRUCTURE_TOWER:
            return mtower.makeTowerWrapper(structure);
        case STRUCTURE_EXTENSION:
            return mextension.makeExtensionWrapper(structure);
        case STRUCTURE_WALL:
            return mwall.makeWallWrapper(structure, pv);
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
