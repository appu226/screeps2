class ExtensionWrapper implements StructureWrapper {
    structure: StructureExtension;
    my: boolean;

    constructor(extension: StructureExtension) {
        this.structure = extension;
        this.my = extension.my;
    }

    process(pv: Paraverse): void {
        let extension = this.structure;
        if (extension.energy < extension.energyCapacity) {
            pv.requestResourceReceive(extension.room.name, extension.id, false, RESOURCE_ENERGY, extension.energyCapacity - extension.energy);
        }
    }
}

export function makeExtensionWrapper(extension: StructureExtension): StructureWrapper {
    return new ExtensionWrapper(extension);
}