class ContainerWrapper implements StructureWrapper {
    element: StructureContainer;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(container: StructureContainer, pv: Paraverse) {
        this.element = container;
        this.my = container.room.controller.my;
        let supply = pv.resourceAmount(container.store, RESOURCE_ENERGY);
        this.resourceRequests = supply > 0
            ? [{
                roomName: this.element.room.name,
                resourceType: RESOURCE_ENERGY,
                amount: supply,
                requestorId: this.element.id,
                resourceRequestType: pv.PUSH_REQUEST,
                isBlocker: pv.availableSpace(container.store, container.storeCapacity) == 0
            }]
            : [];
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.withdraw(this.element, resourceType, amount);
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