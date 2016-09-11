
export function sourceMemory(source: Source) {
    //console.log("utils.memory.sourceMemory for source " + source.id);
    var sm = this.enrichedMemory().sourceMemory;
    if (sm[source.id] === undefined) {
        sm[source.id] = {
            energyCollection: {
                total: 0,
                history: [0]
            }
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
    if (em.isInitialized === undefined) {
        em.isInitialized = false;
    }
    return em;
}

export function storedPaths() {
    var em = <EnrichedMemory>Memory;
    if (em.storedPaths === undefined) {
        em.storedPaths = {};
    }
    return em.storedPaths;
}