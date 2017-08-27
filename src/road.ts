class RoadWrapper implements StructureWrapper {
    element: StructureRoad;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(road: StructureRoad) {
        this.element = road;
        this.my = road.room.controller.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot give energy to road.");
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot take energy from road.");
    }
}

export function makeRoadWrapper(road: StructureRoad): RoadWrapper {
    return new RoadWrapper(road);
}