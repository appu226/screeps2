class MiscStructureWrapper implements StructureWrapper {
    element: Structure;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(structure: Structure, pv: Paraverse) {
        this.element = structure;
        this.my = (<OwnedStructure>structure).my === undefined ? true : (<OwnedStructure>structure).my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot deal with miscStructure");
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error("Cannot deal with miscStructure");
    }
}

export function makeMiscStructureWrapper(structure: Structure, pv: Paraverse): StructureWrapper {
    return new MiscStructureWrapper(structure, pv);
}