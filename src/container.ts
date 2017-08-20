class ContainerWrapper implements StructureWrapper {
    structure: StructureContainer;
    my: boolean;

    constructor(container: StructureContainer) {
        this.structure = container;
        this.my = container.room.controller.my;
    }

    process(pv: Paraverse): void {
    }
}

export function makeContainerWrapper(container: StructureContainer): StructureWrapper {
    return new ContainerWrapper(container);
}