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
var mmiscstructure = require("./miscStructure");
function makeStructureWrapper(structure, pv) {
    switch (structure.structureType) {
        case STRUCTURE_SPAWN:
            return mspawn.makeSpawnWrapper(structure, pv);
        case STRUCTURE_KEEPER_LAIR:
            return mkeeperLair.makeKeeperLairWrapper(structure);
        case STRUCTURE_CONTROLLER:
            return mcontroller.makeControllerWrapper(structure);
        case STRUCTURE_ROAD:
            return mroad.makeRoadWrapper(structure);
        case STRUCTURE_RAMPART:
            return mrampart.makeRampartWrapper(structure);
        case STRUCTURE_TOWER:
            return mtower.makeTowerWrapper(structure, pv);
        case STRUCTURE_EXTENSION:
            return mextension.makeExtensionWrapper(structure, pv);
        case STRUCTURE_CONTAINER:
            return mcontainer.makeContainerWrapper(structure, pv);
        case STRUCTURE_WALL:
            return mwall.makeWallWrapper(structure);
        default:
            pv.log.error("makeStructureWrapper: type " + structure.structureType + " not yet supported.");
            return mmiscstructure.makeMiscStructureWrapper(structure, pv);
    }
}
exports.makeStructureWrapper = makeStructureWrapper;
