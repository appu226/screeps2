class WallWrapper implements StructureWrapper {
    structure: StructureWall;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(wall: StructureWall) {
        this.structure = wall;
        this.my = wall.room.controller.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }
}

export function makeWallWrapper(wall: StructureWall) {
    return new WallWrapper(wall);
}