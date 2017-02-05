"use strict";
var fun = require("./functional");
function processTower(tower) {
    var hostiles = fun.maxBy(tower.room.find(FIND_HOSTILE_CREEPS), function (creep) {
        var dx = creep.pos.x - tower.pos.x;
        var dy = creep.pos.y - tower.pos.y;
        return (1 + creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK))
            / (1 + creep.getActiveBodyparts(TOUGH))
            / (Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20));
    });
    if (hostiles.isPresent) {
        return tower.attack(hostiles.get);
    }
    var patient = fun.maxBy(tower.room.find(FIND_MY_CREEPS).filter(function (creep) { return creep.hits < creep.hitsMax; }), function (creep) {
        var dx = creep.pos.x - tower.pos.y;
        var dy = creep.pos.x - tower.pos.y;
        return creep.hitsMax
            / (creep.hits + 1)
            / Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20);
    });
    if (patient.isPresent) {
        return tower.heal(patient.get);
    }
    var repairs = fun.maxBy(tower.room.find(FIND_MY_STRUCTURES).filter(function (structure) { return structure.hits < structure.hitsMax; }), function (structure) {
        var dx = structure.pos.x - tower.pos.x;
        var dy = structure.pos.y - tower.pos.y;
        return structure.hitsMax
            / (1 + structure.hits)
            / Math.pow(2, Math.sqrt(dx * dx + dy * dy));
    });
    if (repairs.isPresent) {
        return tower.repair(repairs.get);
    }
    return;
}
function processStructure(structure) {
    switch (structure.structureType) {
        case STRUCTURE_TOWER: {
            processTower(structure);
        }
        default:
            return;
    }
}
exports.processStructure = processStructure;
