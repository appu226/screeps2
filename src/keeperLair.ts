class KeeperLairWrapper implements StructureWrapper {
    element: StructureKeeperLair;
    my: boolean;
    resourceRequests: ResourceRequest[];
    constructor(keeperLair: StructureKeeperLair) {
        this.element = keeperLair;
        this.my = false;
        this.resourceRequests = [];
    }
    process(pv: Paraverse): void {
        ;
    }
    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error(`Cannot ask keeper lair to give energy to creep.`);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        throw new Error(`Attempted to give energy to keeper lair.`);
    }
}



export function makeKeeperLairWrapper(keeperLair: StructureKeeperLair): KeeperLairWrapper {
    return new KeeperLairWrapper(keeperLair);
}