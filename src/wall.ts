class WallWrapper implements StructureWrapper {
    structure: StructureWall;
    my: boolean;

    constructor(wall: StructureWall, pv: Paraverse) {
        this.structure = wall;
        this.my = wall.room.controller.my;
    }

    process(pv: Paraverse): void {

    }
}

export function makeWallWrapper(wall: StructureWall, pv: Paraverse) {
    return new WallWrapper(wall, pv);
}