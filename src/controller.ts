import o = require('./option');

class ControllerWrapper implements StructureWrapper {
    structure: StructureController;
    my: boolean;
    constructor(controller: StructureController) {
        this.structure = controller;
        this.my = controller.my;
    }
    process(pv: Paraverse): void {
        if (!this.my) return;
        let roomName = this.structure.room.name;
        let upgraders = pv.getMyCreepsByRoomAndType(this.structure.room, pv.CREEP_TYPE_UPGRADER);
        let totalEfficiency = o.sum(upgraders.map(cw => pv.getEfficiency(cw.creep.memory)));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0) {
            pv.log.debug(`Scheduling upgrader for room ${roomName}`);
            pv.scheduleCreep(this.structure.room, pv.makeUpgraderOrder(`Upgrader_${roomName}`, roomName), 2);
        } else {
            pv.removeCreepOrder(roomName, `Upgrader_${roomName}`);
        }
    }
}



export function makeControllerWrapper(controller: StructureController): ControllerWrapper {
    return new ControllerWrapper(controller);
}