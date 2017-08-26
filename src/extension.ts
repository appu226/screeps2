class ExtensionWrapper implements StructureWrapper {
    structure: StructureExtension;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(extension: StructureExtension, pv: Paraverse) {
        this.structure = extension;
        this.my = extension.my;
        let demand = extension.energyCapacity - extension.energy;
        this.resourceRequests =
            demand > 0
                ? [{
                    roomName: extension.room.name,
                    resourceType: RESOURCE_ENERGY,
                    amount: demand,
                    requestorId: extension.id,
                    resourceRequestType: pv.PULL_REQUEST
                }]
                : [];
    }

    process(pv: Paraverse): void {
    }
}

export function makeExtensionWrapper(extension: StructureExtension, pv: Paraverse): StructureWrapper {
    return new ExtensionWrapper(extension, pv);
}