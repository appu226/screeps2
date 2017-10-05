class StorageWrapper implements StructureWrapper {
    element: StructureStorage;
    my: boolean;
    resourceRequests: ResourceRequest[];

    constructor(storage: StructureStorage) {
        this.element = storage;
        this.my = storage.my;
        this.resourceRequests = [];
    }

    process(pv: Paraverse): void {

    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.withdraw(this.element, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
}

export function makeStorageWrapper(storage: StructureStorage): StorageWrapper {
    return new StorageWrapper(storage);
}