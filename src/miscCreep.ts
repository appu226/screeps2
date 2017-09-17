export class MiscCreepWrapper implements CreepWrapper {
    constructor(creep: Creep, creepType: string) {
        this.element = creep;
        this.creepType = creepType
        this.resourceRequests = [];
        this.memory = null;
    }
    element: Creep;
    creepType: string;
    resourceRequests: ResourceRequest[];
    memory: CreepMemory;
    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }
    process(pv: Paraverse) {
        this.element.say(`creep/MiscCreepWrapper/process: processing creep ${this.element.name} of type ${this.creepType}.`);
    }
    pushEfficiency(efficiency: number): void { }
    getEfficiency(): number { return 0; }
}
