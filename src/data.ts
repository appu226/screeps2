import memoryUtils = require('./memory');

export function collect(): void {
    // console.log("data.collect.all.collect");
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        processEnergyCollection(room);
    }
}
    
/**
 * @Param {Room} room
 */
export function processEnergyCollection(room: Room) {
    // console.log("data.collect.all.processEnergyCollection starting for room " + room.name);
    var sources = <Source[]>room.find(FIND_SOURCES_ACTIVE);
    for (var numSources = 0; numSources < sources.length; ++numSources) {
        var source = sources[numSources];
        var energyCollection = memoryUtils.sourceMemory(source).energyCollection;
        
        // Record the energy collection only if the energy amount has decreased.
        if(source.energy <= energyCollection.previousTickEnergy) {
            var collected = energyCollection.previousTickEnergy - source.energy;
            energyCollection.total += collected;
            energyCollection.history.push(collected);
        }
        // If energy amount has increased (regeneration), don't record anything
        // else { }
        
        energyCollection.previousTickEnergy = source.energy;
        while (energyCollection.history.length > 50) {
            energyCollection.total -= energyCollection.history.shift();
        }
    }
}