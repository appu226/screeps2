import memoryUtils = require('./memory');

export function collect(): void {
    console.log("data.collect.all.collect");
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        processEnergyCollection(room);
    }
}
    
/**
 * @Param {Room} room
 */
export function processEnergyCollection(room: Room) {
    console.log("data.collect.all.processEnergyCollection starting for room " + room.name);
    var sources = <Source[]>room.find(FIND_SOURCES_ACTIVE);
    for (var numSources = 0; numSources < sources.length; ++numSources) {
        var source = sources[numSources];
        var energyCollection = memoryUtils.sourceMemory(source).energyCollection;
        energyCollection.total += energyCollection.history[energyCollection.history.length - 1];
        energyCollection.history.push(0);
        while (energyCollection.history.length > 50) {
            energyCollection.total -= energyCollection.history.shift();
        }
    }
}