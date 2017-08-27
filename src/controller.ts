import o = require('./option');

class ControllerWrapper implements StructureWrapper {
    element: StructureController;
    my: boolean;
    resourceRequests: ResourceRequest[];
    constructor(controller: StructureController) {
        this.element = controller;
        this.my = controller.my;
        this.resourceRequests = [];
    }
    process(pv: Paraverse): void {
        if (!this.my) return;
        let roomName = this.element.room.name;
        let upgraders = pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_UPGRADER);
        let totalEfficiency = o.sum(upgraders.map(cw => pv.getEfficiency(cw.element.memory)));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0) {
            pv.log.debug(`Scheduling upgrader for room ${roomName}`);
            pv.scheduleCreep(this.element.room, pv.makeUpgraderOrder(`Upgrader_${roomName}`, roomName), 2);
        } else {
            pv.removeCreepOrder(roomName, `Upgrader_${roomName}`);
        }
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error(`Controller ${this.element.id} cannot give resource to creep.`);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
}



export function makeControllerWrapper(controller: StructureController): ControllerWrapper {
    return new ControllerWrapper(controller);
}