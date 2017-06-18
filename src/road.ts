class RoadWrapper implements StructureWrapper {
    structure: StructureRoad;
    my: boolean;

    constructor(road: StructureRoad) {
        this.structure = road;
        this.my = road.room.controller.my;
    }

    process(pv: Paraverse): void {
        
    }
}

export function makeRoadWrapper(road: StructureRoad): RoadWrapper {
    return new RoadWrapper(road);
}