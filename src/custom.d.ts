interface EnrichedPathStep extends PathStep {
    /**
     * http://screeps.wikia.com/wiki/Creep
     * Minimum time between moves could be calculated using the following formula:  
     * t = ceil(k * W / M)
     * Where:
     *     t = time (game ticks)
     *     k = movementFactor (1x for plain, 0.5x for road, 5x for swamp)
     *     W = creep weight (Number of body parts, excluding MOVE and empty CARRY parts)
     *     M = number of MOVE parts
     */
    movementFactor: number;
}

interface EnrichedMemory extends Memory {
    storedPaths: { [aid: string]: { [bid: string]: { path: PathStep[]; time: number } } };
    sourceMemory: { [sourceId: string]: SourceMemory };
    isInitialized: boolean;
    uid: number;
    logLevel: number;
    lastCommandNumber: number;
}

interface SourceMemory {
    energyCollection: SourceMemoryEnergyCollection;
}

interface SourceMemoryEnergyCollection {
    previousTickEnergy: number;
    total: number;
    history: number[];
}


interface CreepMemory {
    role: string;
}

interface ScheduledCreepOrder {
    body: string[],
    memory: CreepMemory,
    priority: number
}

interface SpawnMemory {
    scheduledCreepOrders: ScheduledCreepOrder[]
}

interface HarvestorMemory extends CreepMemory {
    source: string;
    destination: string;
}

interface TransporterMemory extends CreepMemory {
    sources: string[];
    destination: string;
}

interface ControllerUpgraderMemory extends CreepMemory {
    destination: string;
}

interface SoldierMemory extends CreepMemory {
    target: string;
}
