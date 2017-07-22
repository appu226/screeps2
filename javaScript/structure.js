"use strict";
var mspawn = require("./spawn");
var mextension = require("./extension");
var mcontroller = require("./controller");
var mkeeperLair = require("./keeperLair");
var mrampart = require("./rampart");
var mroad = require("./road");
var mtower = require("./tower");
var mwall = require("./wall");
var mcontainer = require("./container");
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
        case STRUCTURE_CONTAINER:
            return mcontainer.makeContainerWrapper(structure);
        case STRUCTURE_WALL:
            return mwall.makeWallWrapper(structure, pv);
        default: throw new Error("makeStructureWrapper: type " + structure.structureType + " not yet supported.");
    }
}
exports.makeStructureWrapper = makeStructureWrapper;
