class RampartWrapper implements StructureWrapper {
    structure: StructureRampart;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(rampart: StructureRampart) {
        this.structure = rampart;
        this.my = rampart.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }
}

export function makeRampartWrapper(rampart: StructureRampart): RampartWrapper {
    return new RampartWrapper(rampart);
}