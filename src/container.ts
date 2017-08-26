class ContainerWrapper implements StructureWrapper {
    structure: StructureContainer;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(container: StructureContainer, pv: Paraverse) {
        this.structure = container;
        this.my = container.room.controller.my;
        let supply = container.store[RESOURCE_ENERGY];
        this.resourceRequests = supply > 0
            ? [{
                roomName: this.structure.room.name,
                resourceType: RESOURCE_ENERGY,
                amount: supply,
                requestorId: this.structure.id,
                resourceRequestType: pv.PUSH_REQUEST
            }]
            : [];
    }

    process(pv: Paraverse): void {
    }
}

export function makeContainerWrapper(container: StructureContainer, pv: Paraverse): StructureWrapper {
    return new ContainerWrapper(container, pv);
}