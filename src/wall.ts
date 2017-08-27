class WallWrapper implements StructureWrapper {
    element: StructureWall;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(wall: StructureWall) {
        this.element = wall;
        this.my = wall.room.controller.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot take energy from ConstructedWall");
    }

    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot give energy to ConstructedWall");
    }
}

export function makeWallWrapper(wall: StructureWall) {
    return new WallWrapper(wall);
}