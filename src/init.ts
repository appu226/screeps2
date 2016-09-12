
import mapUtils = require('./map');
import memoryUtils = require('./memory');
import functional = require('./functional');
 
    
/** @Param {Bool} foceInit */
export function initializeAll(forceInit: boolean): void {
    var em = memoryUtils.enrichedMemory();
    if (!forceInit && em.isInitialized && Game.time % 1000 != 0)
        return;
    em.isInitialized = false;
    // console.log("init.initializeAll: initializing");
    for (var roomName in Game.rooms) {
        var room = Game.rooms[roomName];
        initRoom(room);
    }
    em.isInitialized = true;
}
    
/** @Param {Room} room */
export function initRoom(room: Room): void {
    // console.log("init.spawn.initRoom starting " + room.name);
    var sources = <Source[]>room.find(FIND_SOURCES_ACTIVE);
    var spawns = <Spawn[]>room.find(FIND_MY_SPAWNS);
    var controller = room.controller;
    // console.log("init.spawn.initRoom: found " + sources.length + " sources, " + spawns.length + " spawns.")
    for (var sourceNum = 0; sourceNum < sources.length; ++sourceNum) {
        var source = sources[sourceNum];
        for (var spawnNum = 0; spawnNum < spawns.length; ++spawnNum) {
            var spawn = spawns[spawnNum];
            mapUtils.getStoredPath(spawn.id, spawn.pos, source.id, source.pos);
        }
        mapUtils.getStoredPath(controller.id, controller.pos, source.id, source.pos);
    }
    for (var spawnNum = 0; spawnNum < spawns.length; ++spawnNum) {
        var spawn = spawns[spawnNum];
        var sortedSources = sources.filter(
            function(source) {
                var res = (source.room.controller.level > 3
                    || (source.pos.findInRange(FIND_HOSTILE_CREEPS, 15).length == 0
                        && source.pos.findInRange(FIND_HOSTILE_STRUCTURES, 15).length == 0));
                // console.log("must keep " + source.id + " is " + res);
                return res;
            }
        ).map(
            function(source) {
                return <SpawnToSourceDistance>{
                    id: source.id,
                    distance: mapUtils.getDistance(spawn.id, spawn.pos, source.id, source.pos, room, 1)
                };
            }
            );
        sortedSources.sort(function(a, b) { return a.distance - b.distance; });
        memoryUtils.spawnMemory(spawn).sortedSources = sortedSources;
    }
}
    