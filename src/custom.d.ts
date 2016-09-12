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
}

interface SourceMemory {
    energyCollection: SourceMemoryEnergyCollection;
    harvestors: string[];
    transporters: string[];
}

interface SourceMemoryEnergyCollection {
    previousTickEnergy: number;
    total: number;
    history: number[];
}

interface SpawnMemory {
    sortedSources: SpawnToSourceDistance[];   
}

interface SpawnToSourceDistance {
    id: string;
    distance: number;    
}

interface CreepMemory {
    role: string
}

interface HarvestorMemory extends CreepMemory {
    source: string;
    sourceType: string;
    destination: string;
    destinationType: string;
}

interface TransporterMemory extends CreepMemory {
    source: string;
    sourceType: string;
    destination: string;
    destinationType: string;
}