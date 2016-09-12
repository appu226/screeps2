
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
            transporters: [],
            harvestors: []
        };
    }
    return sm[source.id];
};

export function enrichedMemory(): EnrichedMemory {
    var em = <EnrichedMemory>Memory;
    if (em.sourceMemory === undefined) {
        em.sourceMemory = {};
    }
    if (em.storedPaths === undefined) {
        em.storedPaths = {};
    }
    if (em.uid === undefined) {
        em.uid = 0;
    }
    if (em.isInitialized === undefined) {
        em.isInitialized = false;
    }
    return em;
}

export function creepMemory(creep: Creep): CreepMemory {
    var memory = <CreepMemory>creep.memory;
    if (memory.role === undefined) {
        console.warn("Creep " + creep.name + " has undefined role! Returning bogus memory with role \"NA\".");
        return {role: "NA"};
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