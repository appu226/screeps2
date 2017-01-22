"use strict";
var memoryUtils = require("./memory");
function enrichMovementFactor(pathIn, room) {
    var path = pathIn;
    for (var posNum = 0; posNum < path.length; ++posNum) {
        var pathPos = path[posNum];
        if (pathPos.movementFactor !== undefined) {
            return;
        }
        // console.log("utils.map.enrichMovementFactor: enriching position " + pathPos.x + " " + pathPos.y + " in " + room.name);
        var pos = room.getPositionAt(pathPos.x, pathPos.y);
        pathPos.movementFactor = movementFactor(movementTerrain(pos));
    }
    return path;
}
exports.enrichMovementFactor = enrichMovementFactor;
/**
 * @Param {RoomPosition} pos
 */
function movementTerrain(pos) {
    var isRoad = false;
    var isSwamp = false;
    var allObjects = pos.look();
    // console.log("found " + allObjects.length + " objects.");
    for (var objectNum = 0; objectNum < allObjects.length; ++objectNum) {
        var object = allObjects[objectNum];
        if (object.type == 'terrain') {
            isSwamp = isSwamp || object.terrain == 'swamp';
        }
        else if (object.type == 'structure') {
            isRoad = isRoad || object.structure.structureType == STRUCTURE_ROAD;
        }
    }
    if (isRoad) {
        return 'road';
    }
    else if (isSwamp) {
        return 'swamp';
    }
    else {
        return 'plain';
    }
}
exports.movementTerrain = movementTerrain;
/**
 * @Param {String} terrain Either 'road' 'swamp' or 'plain'
 * http://screeps.wikia.com/wiki/Creep
 */
function movementFactor(terrain) {
    // console.log("terrain is " + terrain);
    if (terrain == 'road') {
        return .5;
    }
    else if (terrain == 'swamp') {
        return 5;
    }
    else if (terrain == 'plain') {
        return 1;
    }
    else {
        throw "utils.map.movementFactor: Illegal terrain. Expected road/swamp/plain, got: " + terrain;
    }
}
exports.movementFactor = movementFactor;
/**
 * @Param {String} aid Id of source object.
 * @Param {RoomPosition} apos Position of source object.
 * @Param {String} bid Id of destination object.
 * @Param {RoomPosition} bpos Position of destination object
 */
function getStoredPath(aid, apos, bid, bpos) {
    // console.log("init.initStoredPaths " + aid + " to " + bid);
    var sp = memoryUtils.storedPaths();
    if (sp[aid] === undefined)
        sp[aid] = {};
    if (sp[bid] === undefined)
        sp[bid] = {};
    if (sp[aid][bid] === undefined) {
        sp[aid][bid] = { path: [], time: Game.time - 5000 };
        sp[bid][aid] = { path: [], time: Game.time - 5000 };
    }
    //was initialized in the last 50 ticks, so skip
    if (sp[aid][bid].time > Game.time - 50)
        return sp[aid][bid].path;
    var path = apos.findPathTo(bpos);
    sp[aid][bid] = {
        path: path,
        time: Game.time
    };
    sp[bid][aid] = {
        path: path.slice(0).reverse(),
        time: Game.time
    };
    return sp[aid][bid].path;
}
exports.getStoredPath = getStoredPath;
/**
 * @Param {String} aid Id of source object.
 * @Param {RoomPosition} apos Position of source object.
 * @Param {String} bid Id of destination object.
 * @Param {RoomPosition} bpos Position of destination object
 * @Param {Room} room Room containing both objects.
 * @Param {number} wByM creep.weight / creep.move body parts
 */
function getDistance(aid, apos, bid, bpos, room, wByM) {
    // console.log("utils.map.getDistance " + aid + " " + bid);
    var path = enrichMovementFactor(getStoredPath(aid, apos, bid, bpos), room);
    var result = 0;
    for (var posNum = 0; posNum < path.length; ++posNum) {
        result += Math.ceil(path[posNum].movementFactor * wByM);
    }
    return result;
}
exports.getDistance = getDistance;
function getAllSourcesInRoom(room) {
    return room.find(FIND_SOURCES);
}
exports.getAllSourcesInRoom = getAllSourcesInRoom;
function oppositeDirection(direction) {
    switch (direction) {
        case TOP: return BOTTOM;
        case TOP_RIGHT: return BOTTOM_LEFT;
        case RIGHT: return LEFT;
        case BOTTOM_RIGHT: return TOP_LEFT;
        case BOTTOM: return TOP;
        case BOTTOM_LEFT: return TOP_RIGHT;
        case LEFT: return RIGHT;
        case TOP_LEFT: return BOTTOM_RIGHT;
        default: {
            var message = "map/oppositeDirection: Unexpected direction " + direction + ".";
            console.log(message);
            throw message;
        }
    }
}
exports.oppositeDirection = oppositeDirection;
