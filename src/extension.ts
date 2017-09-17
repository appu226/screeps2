class ExtensionWrapper implements StructureWrapper {
    element: StructureExtension;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(extension: StructureExtension, pv: Paraverse) {
        this.element = extension;
        this.my = extension.my;
        let demand = extension.energyCapacity - extension.energy;
        this.resourceRequests =
            demand > 0
                ? [{
                    roomName: extension.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: extension.id,
                    resourceRequestType: pv.PULL_REQUEST,
                    //isBlocker is used for checking if you need more transporters
                    //spawn and extension energy becomes 0 suddenly rather than gradually
                    //so you can't really use spawn or extension data to check if you need more transporters
                    isBlocker: false
                }]
                : [];
    }

    process(pv: Paraverse): void {
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error(`Extension (${this.element.id}) cannot be asked to give resource.`);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
}

export function makeExtensionWrapper(extension: StructureExtension, pv: Paraverse): StructureWrapper {
    return new ExtensionWrapper(extension, pv);
}