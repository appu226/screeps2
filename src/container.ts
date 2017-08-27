class ContainerWrapper implements StructureWrapper {
    element: StructureContainer;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(container: StructureContainer, pv: Paraverse) {
        this.element = container;
        this.my = container.room.controller.my;
        let supply = container.store[RESOURCE_ENERGY];
        this.resourceRequests = supply > 0
            ? [{
                roomName: this.element.room.name,
                resourceType: RESOURCE_ENERGY,
                amount: supply,
                requestorId: this.element.id,
                resourceRequestType: pv.PUSH_REQUEST
            }]
            : [];
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

    process(pv: Paraverse): void {
    }
}

export function makeContainerWrapper(container: StructureContainer, pv: Paraverse): StructureWrapper {
    return new ContainerWrapper(container, pv);
}