"use strict";
function sourceMemory(source) {
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
}
exports.sourceMemory = sourceMemory;
;
exports.LogLevel = {
    SILENT: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4
};
function enrichedMemory() {
    var em = Memory;
    if (em.isInitialized === undefined) {
        em.uid = 0;
        em.storedPaths = {};
        em.sourceMemory = {};
        em.isInitialized = false;
        em.logLevel = exports.LogLevel.WARN;
        em.lastCommandNumber = 0;
        em.creepGroups = [];
        em.messageLog = [];
        em.maxMessageLogSize = 100;
        em.neutralStructures = [];
    }
    while (em.messageLog.length > em.maxMessageLogSize)
        em.messageLog.shift();
    return em;
}
exports.enrichedMemory = enrichedMemory;
function creepMemory(creep) {
    var memory = creep.memory;
    if (memory.creepMemoryType === undefined) {
        console.log("memory/creepMemory: creep " + creep.name + " has no creepMemoryType.");
    }
    return memory;
}
exports.creepMemory = creepMemory;
function storedPaths() {
    var em = Memory;
    if (em.storedPaths === undefined) {
        em.storedPaths = {};
    }
    return em.storedPaths;
}
exports.storedPaths = storedPaths;
function spawnMemory(spawn) {
    var sm = spawn.memory;
    return sm;
}
exports.spawnMemory = spawnMemory;
function getUid() {
    return enrichedMemory().uid++;
}
exports.getUid = getUid;
