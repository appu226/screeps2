import functional = require('./functional');

export function enrichMovementFactor(path: [PathStep], room: Room) {
    // console.log("utils.map.enrichMovementFactor: starting");
    for (var posNum = 0; posNum < path.length; ++posNum) {
        var pathPos = path[posNum];
        if (pathPos.movementFactor !== undefined) {
            return;
        }
        // console.log("utils.map.enrichMovementFactor: enriching position " + pathPos.x + " " + pathPos.y + " in " + room.name);
        var pos = room.getPositionAt(pathPos.x, pathPos.y);
        pathPos.movementFactor = this.movementFactor(this.movementTerrain(pos));
    }
}
/**
 * @Param {RoomPosition} pos
 */
export function movementTerrain(pos) {
    var isRoad = false;
    var isSwamp = false;
    var allObjects = pos.look();
    // console.log("found " + allObjects.length + " objects.");
    for (var objectNum = 0; objectNum < allObjects.length; ++objectNum) {
        var object = allObjects[objectNum];
        if (object.type == 'terrain') {
            isSwamp = isSwamp || object.terrain == 'swamp';
        } else if (object.type == 'structure') {
            isRoad = isRoad || object.structure.structureType == STRUCTURE_ROAD;
        }
    }
    if (isRoad) {
        return 'road';
    } else if (isSwamp) {
        return 'swamp';
    } else {
        return 'plain';
    }
}
    
/**
 * @Param {String} terrain Either 'road' 'swamp' or 'plain'
 * http://screeps.wikia.com/wiki/Creep
 */
export function movementFactor(terrain): number {
    // console.log("terrain is " + terrain);
    if (terrain == 'road') {
        return .5;
    } else if (terrain == 'swamp') {
        return 5;
    } else if (terrain == 'plain') {
        return 1;
    } else {
        throw "utils.map.movementFactor: Illegal terrain. Expected road/swamp/plain, got: " + terrain;
    }
}
    
/** 
 * @Param {String} aid Id of source object.
 * @Param {RoomPosition} apos Position of source object.
 * @Param {String} bid Id of destination object.
 * @Param {RoomPosition} bpos Position of destination object
 */
export function getStoredPath(
    aid: string,
    apos: RoomPosition,
    bid: string,
    bpos: RoomPosition
): PathStep[] {
    // console.log("init.initStoredPaths " + aid + " to " + bid);
    functional.getOrInitObject(Memory, 'storedPaths');
    functional.getOrInitObject(Memory.storedPaths, aid);
    functional.getOrInitObject(Memory.storedPaths, bid);
    if (Memory.storedPaths[aid][bid] === undefined) {
        Memory.storedPaths[aid][bid] = { path: [], time: Game.time - 5000 };
        Memory.storedPaths[bid][aid] = { path: [], time: Game.time - 5000 };
    }
        
    //was initialized in the last 50 ticks, so skip
    if (Memory.storedPaths[aid][bid].time > Game.time - 50)
        return Memory.storedPaths[aid][bid].path;

    var path = apos.findPathTo(bpos);
    Memory.storedPaths[aid][bid] = {
        path: path,
        time: Game.time
    };
    Memory.storedPaths[bid][aid] = {
        path: path.slice(0).reverse(),
        time: Game.time
    }
}
    
    
/** 
 * @Param {String} aid Id of source object.
 * @Param {RoomPosition} apos Position of source object.
 * @Param {String} bid Id of destination object.
 * @Param {RoomPosition} bpos Position of destination object
 * @Param {Room} room Room containing both objects.
 * @Param {number} wByM creep.weight / creep.move body parts
 */
export function getDistance(
    aid: string,
    apos: RoomPosition,
    bid: string,
    bpos: RoomPosition,
    room: Room,
    wByM: number
): number {
    // console.log("utils.map.getDistance " + aid + " " + bid);
    var path = this.getStoredPath(aid, apos, bid, bpos, room);
    this.enrichMovementFactor(path, room);
    var result = 0;
    for (var posNum = 0; posNum < path.length; ++posNum) {
        result += Math.ceil(path[posNum].movementFactor * wByM);
    }
    return result;
}
    