class KeeperLairWrapper implements StructureWrapper {
    structure: StructureKeeperLair;
    my: boolean;
    constructor(keeperLair: StructureKeeperLair) {
        this.structure = keeperLair;
        this.my = false;
    }
    process(pv: Paraverse): void {
        ;
    }
}



export function makeKeeperLairWrapper(keeperLair: StructureKeeperLair): KeeperLairWrapper {
    return new KeeperLairWrapper(keeperLair);
}