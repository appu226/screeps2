class KeeperLairWrapper implements StructureWrapper {
    structure: StructureKeeperLair;
    my: boolean;
    resourceRequests: ResourceRequest[];
    constructor(keeperLair: StructureKeeperLair) {
        this.structure = keeperLair;
        this.my = false;
        this.resourceRequests = [];
    }
    process(pv: Paraverse): void {
        ;
    }
}



export function makeKeeperLairWrapper(keeperLair: StructureKeeperLair): KeeperLairWrapper {
    return new KeeperLairWrapper(keeperLair);
}