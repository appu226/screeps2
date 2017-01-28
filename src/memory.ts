
export function sourceMemory(source: Source) {
    //console.log("utils.memory.sourceMemory for source " + source.id);
    var sm = enrichedMemory().sourceMemory;
    if (sm[source.id] === undefined) {
        sm[source.id] = {
            energyCollection: {
                total: 0,
                history: [0],
                previousTickEnergy: source.energy
            }
        };
    }
    return sm[source.id];
};

export var LogLevel = {
    SILENT: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
}

export function enrichedMemory(): EnrichedMemory {
    var em = <EnrichedMemory>Memory;
    if (em.isInitialized === undefined) {
        em.uid = 0;
        em.storedPaths = {};
        em.sourceMemory = {};
        em.isInitialized = false;
        em.logLevel = LogLevel.WARN;
        em.lastCommandNumber = 0;
        em.creepGroups = [];
        em.messageLog = [];
        em.maxMessageLogSize = 100;
    }
    while(em.messageLog.length > em.maxMessageLogSize)
        em.messageLog.shift();
    return em;
}

export function creepMemory(creep: Creep): CreepMemory {
    var memory = <CreepMemory>creep.memory;
    if (memory.creepMemoryType === undefined) {
        console.log(`memory/creepMemory: creep ${creep.name} has no creepMemoryType.`);
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
    var sm = <SpawnMemory>spawn.memory;
    return sm;
}

export function getUid(): number {
    return enrichedMemory().uid++;
}