import log = require('./log');
import fun = require('./functional');

function processTower(tower: StructureTower) {
    var hostiles = fun.maxBy<Creep>(
        tower.room.find<Creep>(FIND_HOSTILE_CREEPS),
        (creep: Creep) => {
            var dx = creep.pos.x - tower.pos.x;
            var dy = creep.pos.y - tower.pos.y;
            return (1 + creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK))
                / (1 + creep.getActiveBodyparts(TOUGH))
                / (Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20));
        }
    );
    if (hostiles.isPresent) {
        return tower.attack(hostiles.get);
    }

    var patient =
        fun.maxBy<Creep>(
            tower.room.find<Creep>(FIND_MY_CREEPS).filter(
                (creep: Creep) => { return creep.hits < creep.hitsMax; }),
            (creep: Creep) => {
                var dx = creep.pos.x - tower.pos.y;
                var dy = creep.pos.x - tower.pos.y;
                return creep.hitsMax
                    / (creep.hits + 1)
                    / Math.pow(2, Math.sqrt(dx * dx + dy * dy) / 20);
            });
    if (patient.isPresent) {
        return tower.heal(patient.get);
    }

    var repairs =
        fun.maxBy<Structure>(
            tower.room.find<Structure>(FIND_MY_STRUCTURES).filter(
                (structure: Structure) => { return structure.hits < structure.hitsMax; }
            ),
            (structure: Structure) => {
                var dx = structure.pos.x - tower.pos.x;
                var dy = structure.pos.y - tower.pos.y;
                return structure.hitsMax
                    / (1 + structure.hits)
                    / Math.pow(2, Math.sqrt(dx * dx + dy * dy));
            }
        );
    if(repairs.isPresent) {
        return tower.repair(repairs.get);
    }
    return;
}

export function processStructure(structure: Structure) {
    switch (structure.structureType) {
        case STRUCTURE_TOWER: {
            processTower(<StructureTower>structure);
        }
        default:
            return;
    }
}