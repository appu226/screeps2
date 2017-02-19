import log = require('./log');
import fun = require('./functional');

function processTower(tower: StructureTower) {
    var hostiles =
        fun.maxBy<Creep>(
            tower.room.find<Creep>(FIND_HOSTILE_CREEPS),
            (creep: Creep) => {
                return (1 + creep.getActiveBodyparts(ATTACK) + creep.getActiveBodyparts(RANGED_ATTACK))
                    / (1 + creep.getActiveBodyparts(TOUGH));
            }
        );
    if (hostiles.isPresent) {
        return tower.attack(hostiles.get);
    }

    var patient =
        fun.maxBy<Creep>(
            tower.room.find<Creep>(FIND_MY_CREEPS).filter(
                (creep: Creep) => { return creep.hits < creep.hitsMax; }
            ),
            (creep: Creep) => { return creep.hits * -1; });
    if (patient.isPresent) {
        return tower.heal(patient.get);
    }

    if (tower.energy * 2 < tower.energyCapacity)
        return;

    var repairs =
        fun.maxBy<Structure>(
            tower.room.find<Structure>(FIND_STRUCTURES).filter(
                (structure: Structure) => {
                    return structure.hits < structure.hitsMax
                        && structure.structureType != STRUCTURE_CONTROLLER
                        && (
                            (<OwnedStructure>structure).my === undefined
                            || (<OwnedStructure>structure).my
                        );
                }
            ),
            (structure: Structure) => { return structure.hits * -1; }
        );
    if (repairs.isPresent) {
        return tower.repair(repairs.get);
    }
    return;
}

export function processStructure(structure: Structure) {
    switch (structure.structureType) {
        case STRUCTURE_TOWER: {
            return processTower(<StructureTower>structure);
        }
        default:
            return;
    }
}