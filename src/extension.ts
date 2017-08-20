class ExtensionWrapper implements StructureWrapper {
    structure: StructureExtension;
    my: boolean;

    constructor(extension: StructureExtension) {
        this.structure = extension;
        this.my = extension.my;
    }

    process(pv: Paraverse): void {
    }
}

export function makeExtensionWrapper(extension: StructureExtension): StructureWrapper {
    return new ExtensionWrapper(extension);
}