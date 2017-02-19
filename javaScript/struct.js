"use strict";
var fun = require("./functional");
function processTower(tower) {
    var hostiles = fun.maxBy(tower.room.find(FIND_HOSTILE_CREEPS), function (creep) {
        return (1 + creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK))
            / (1 + creep.getActiveBodyparts(TOUGH));
    });
    if (hostiles.isPresent) {
        return tower.attack(hostiles.get);
    }
    var patient = fun.maxBy(tower.room.find(FIND_MY_CREEPS).filter(function (creep) { return creep.hits < creep.hitsMax; }), function (creep) { return creep.hits * -1; });
    if (patient.isPresent) {
        return tower.heal(patient.get);
    }
    if (tower.energy * 2 < tower.energyCapacity)
        return;
    var repairs = fun.maxBy(tower.room.find(FIND_STRUCTURES).filter(function (structure) {
        return structure.hits < structure.hitsMax
            && structure.structureType != STRUCTURE_CONTROLLER
            && (structure.my === undefined
                || structure.my);
    }), function (structure) { return structure.hits * -1; });
    if (repairs.isPresent) {
        return tower.repair(repairs.get);
    }
    return;
}
function processStructure(structure) {
    switch (structure.structureType) {
        case STRUCTURE_TOWER: {
            return processTower(structure);
        }
        default:
            return;
    }
}
exports.processStructure = processStructure;
