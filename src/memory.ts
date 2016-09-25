
export function sourceMemory(source: Source) {
    //console.log("utils.memory.sourceMemory for source " + source.id);
    var sm = enrichedMemory().sourceMemory;
    if (sm[source.id] === undefined) {
        sm[source.id] = {
            energyCollection: {
                total: 0,
                history: [0],
                previousTickEnergy: source.energy
            },
            harvestors: []
        };
    }
    return sm[source.id];
};

export function enrichedMemory(): EnrichedMemory {
    var em = <EnrichedMemory>Memory;
    if (em.isInitialized === undefined) {
        em.uid = 0;
        em.storedPaths = {};
        em.sourceMemory = {};
        em.transporterChain = {};
        em.isInitialized = false;
    }

    return em;
}

export function creepMemory(creep: Creep): CreepMemory {
    var memory = <CreepMemory>creep.memory;
    if (memory.role === undefined) {
        console.warn("Creep " + creep.name + " has undefined role! Returning bogus memory with role \"NA\".");
        return { role: "NA" };
    }
    return memory;
}

export function storedPaths() {
    var em = <EnrichedMemory>Memory;
    if (em.storedPaths === undefined) {
        em.storedPaths = {};
    }
    return em.storedPaths;
}

export function spawnMemory(spawn: StructureSpawn): SpawnMemory {
    var sp = <SpawnMemory>spawn.memory;
    if (sp.sortedSources === undefined) {
        sp.sortedSources = [];
    }
    return sp;
}

export function getUid(): number {
    return enrichedMemory().uid++;
}

export function transporterChain(
    sourceType: string,
    sourceId: string,
    destinationType: string,
    destinationId: string
): TransporterChain {
    var key = sourceId + "_" + destinationId;
    var em = enrichedMemory();
    var result = em.transporterChain[key];
    if (result === undefined) {
        result = {
            sourceType: sourceType,
            sourceId: sourceId,
            destinationType: destinationType,
            destinationId: destinationId,
            transporterNames: []
        };
        em.transporterChain[key] = result;
    }
    return result;
}