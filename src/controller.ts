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
        let upgraders = pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_UPGRADER).filter(cw => cw.element.ticksToLive > 50);
        let totalEfficiency = o.sum(upgraders.map(cw => pv.getEfficiency(cw.element.memory)));
        let upgradeCapacity = o.sum(upgraders.map(cw => cw.element.getActiveBodyparts(WORK)));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0 && upgradeCapacity < 15) {
            pv.log(["controller", "process", "scheduleCreep"], () => `controller.ts/ControllerWrapper.process: Scheduling upgrader for room ${roomName}`);
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