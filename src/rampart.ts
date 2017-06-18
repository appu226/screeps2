class RampartWrapper implements StructureWrapper {
    structure: StructureRampart;
    my: boolean;

    constructor(rampart: StructureRampart, pv: Paraverse) {
        this.structure = rampart;
        this.my = rampart.my;
    }

    process(pv: Paraverse): void {
        
    }
}

export function makeRampartWrapper(rampart: StructureRampart, pv: Paraverse): RampartWrapper {
    return new RampartWrapper(rampart, pv);
}