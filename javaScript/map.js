"use strict";
var fun = require("./functional");
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
function transposeXY(c) {
    return { x: c.y, y: c.x };
}
function transposePath(p) {
    return p.map(function (xy) { return transposeXY(xy); });
}
function findLinearPath(x1, y1, x2, y2) {
    if (x1 == x2 && y1 == y2) {
        return [{ x: x1, y: y1 }];
    }
    else if (x1 == x2) {
        return transposePath(findLinearPath(y1, x1, y2, x2));
    }
    else if (y1 == y2) {
        if (x1 <= x2) {
            return fun.aToBStepC(x1, x2, 1).map(function (x) { return { x: x, y: y1 }; });
        }
        else {
            return fun.aToBStepC(x1, x2, -1).map(function (x) { return { x: x, y: y1 }; });
        }
    }
    else {
        var dx = (x2 - x1), dy = (y2 - y1);
        // Let p(t) = (x1 + t*dx, y1 + t*dy)
        // Therefore: p(0) = (x1, y1)
        //            p(1) = (x2, y2)
        // t's where x value changes
        var x_ts = [];
        for (var xti = .5; xti <= Math.abs(dx); xti = xti + 1)
            x_ts.push(Math.abs(xti / dx));
        // t's where y value changes
        var y_ts = [];
        for (var yti = .5; yti <= Math.abs(dy); yti = yti + 1)
            y_ts.push(Math.abs(yti / dy));
        var next_t = 0;
        var lastxy = { x: x1, y: y1 };
        var result = [lastxy];
        while (x_ts.length > 0 || y_ts.length > 0) {
            if (x_ts.length == 0 || (y_ts.length != 0 && x_ts[0] > y_ts[0])) {
                // next jump is at y
                next_t = y_ts.shift() + Math.abs(.5 / dy);
                result.push({ x: lastxy.x, y: Math.round(y1 + next_t * dy) });
            }
            else {
                // next jump is at x
                next_t = x_ts.shift() + Math.abs(.5 / dx);
                result.push({ x: Math.round(x1 + next_t * dx), y: lastxy.y });
            }
            // //remove kinks in the path, such that:
            // //  X                     X
            // //  X                     X
            // //  X                     X
            // //  XX                     X
            // //   X   => turns into =>  X
            // //   X                     X
            // //   XX                     X
            // //    X                     X
            // //    X                     X
            // //    X                     X
            // if (result.length >= 3) {
            //     var last_dx = result[result.length - 1].x - result[result.length - 2].x;
            //     var last_to_last_dx = result[result.length - 2].x - result[result.length - 3].x;
            //     var last_dy = result[result.length - 1].y - result[result.length - 2].y;
            //     var last_to_last_dy = result[result.length - 2].y - result[result.length - 3].y;
            //     if (last_dx != last_to_last_dx && last_dy != last_to_last_dy) { // change in direction
            //         //remove second-last point
            //         result.splice(result.length - 2, 1);
            //     }
            // }
            lastxy = result[result.length - 1];
        }
        return result;
    }
}
exports.findLinearPath = findLinearPath;
function makeStructures(x1, y1, x2, y2, roomName, structure) {
    var path = findLinearPath(x1, y1, x2, y2);
    for (var ci = 0; ci < path.length; ++ci) {
        (new RoomPosition(path[ci].x, path[ci].y, roomName)).createConstructionSite(structure);
    }
}
exports.makeStructures = makeStructures;
