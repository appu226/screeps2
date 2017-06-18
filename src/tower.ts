class TowerWrapper implements StructureWrapper {
    structure: StructureTower;
    my: boolean;

    constructor(tower: StructureTower) {
        this.structure = tower;
        this.my = tower.my;
    }

    process(pv: Paraverse): void {

    }
}

export function makeTowerWrapper(tower: StructureTower): StructureWrapper {
    return new TowerWrapper(tower);
}