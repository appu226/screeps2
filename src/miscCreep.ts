export class MiscCreepWrapper implements CreepWrapper {
    constructor(creep: Creep, creepType: string) {
        this.creep = creep;
        this.creepType = creepType
    }
    creep: Creep;
    creepType: string;
    process(pv: Paraverse) {
        this.creep.say(`creep/MiscCreepWrapper/process: processing creep ${this.creep.name} of type ${this.creepType}.`);
    }
    pushEfficiency(efficiency: number): void { }
    getEfficiency(): number { return 0; }
}
