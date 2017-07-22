class ContainerWrapper implements StructureWrapper {
    structure: StructureContainer;
    my: boolean;

    constructor(container: StructureContainer) {
        this.structure = container;
        this.my = container.room.controller.my;
    }

    process(pv: Paraverse): void {
        let container = this.structure;
        let storedEnergy = container.store[RESOURCE_ENERGY];
        if (storedEnergy < container.storeCapacity) {
            pv.requestResourceReceive(container.room.name, container.id, false, RESOURCE_ENERGY, 50);
        }
        if (storedEnergy > 0) {
            pv.requestResourceSend(container.room.name, container.id, false, RESOURCE_ENERGY, storedEnergy);
        }
    }
}

export function makeContainerWrapper(container: StructureContainer): StructureWrapper {
    return new ContainerWrapper(container);
}