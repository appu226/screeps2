import o = require('./option');

class ControllerWrapper implements StructureWrapper {
    structure: StructureController;
    my: boolean;
    constructor(controller: StructureController) {
        this.structure = controller;
        this.my = controller.my;
    }
    process(pv: Paraverse): void {
        if(!this.my) return;
        let roomName = this.structure.room.name;
        let upgraders = pv.getMyCreeps().filter(cw => cw.creepType == pv.CREEP_TYPE_UPGRADER && cw.creep.room.name == roomName);
        let totalEfficiency = o.sum(upgraders.map(cw => cw.getEfficiency()));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0 ) {
            pv.scheduleCreep(roomName, `Upgrader_${roomName}`, pv.CREEP_TYPE_UPGRADER, .3);
        }
    }
}



export function makeControllerWrapper(controller: StructureController): ControllerWrapper {
    return new ControllerWrapper(controller);
}