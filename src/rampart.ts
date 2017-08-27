class RampartWrapper implements StructureWrapper {
    element: StructureRampart;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(rampart: StructureRampart) {
        this.element = rampart;
        this.my = rampart.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot transfer energy to Rampart");
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot take energy from Rampart");
    }
}

export function makeRampartWrapper(rampart: StructureRampart): RampartWrapper {
    return new RampartWrapper(rampart);
}