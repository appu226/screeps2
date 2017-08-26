class RoadWrapper implements StructureWrapper {
    structure: StructureRoad;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(road: StructureRoad) {
        this.structure = road;
        this.my = road.room.controller.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {
        
    }
}

export function makeRoadWrapper(road: StructureRoad): RoadWrapper {
    return new RoadWrapper(road);
}