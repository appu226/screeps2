"use strict";
var mopt = require("./option");
var RoomWrapperImpl = (function () {
    function RoomWrapperImpl(room) {
        this.room = room;
    }
    RoomWrapperImpl.prototype.process = function (pv) {
        var me = this.room;
        if (me.controller !== undefined && me.controller.my) {
            //remove stale creep orders.
            var pq = pv.getCreepOrders(me.name);
            while (!pq.isEmpty && pv.game.creeps[pq.peek().get.name] !== undefined) {
                pq.pop();
            }
            var optSource = mopt.None();
            // check if construction sites already exist
            if (pv.getConstructionSitesFromRoom(me).length > 0) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            }
            else if (me.controller.level >= 2 && canBuild(me, STRUCTURE_CONTAINER, pv) && (optSource = findSourceWithoutContainer(me, pv)).isPresent) {
                pv.constructNextContainer(optSource.get);
            }
            else if (canBuild(me, STRUCTURE_EXTENSION, pv)) {
                pv.constructNextSite(me, STRUCTURE_EXTENSION);
            }
            else if (canBuild(me, STRUCTURE_TOWER, pv)) {
                pv.constructNextSite(me, STRUCTURE_TOWER);
            }
            else if (canBuild(me, STRUCTURE_ROAD, pv) && pv.mustBuildRoad(me)) {
                var roadPos = pv.getRoadToBeBuilt(me);
                me.createConstructionSite(roadPos.x, roadPos.y, STRUCTURE_ROAD);
            }
            var hostileCreeps = pv.getHostileCreepsInRoom(me);
            for (var hci = 0; hci < hostileCreeps.length; ++hci) {
                var hc = hostileCreeps[hci];
                if (hc.owner.username == "Source Keeper")
                    continue;
                if (pv.getTotalCollectedDefense(hc.id) < pv.getSoldierCapability(hc)) {
                    pv.scheduleCreep(me, pv.makeDefenderOrder("defender_" + me.name + "_" + hc.id, hc.id), 2);
                }
            }
            pv.manageResources(me);
            if (me.controller.level >= 4 && me.energyCapacityAvailable >= 900) {
                var memory = pv.getRoomMemory(me);
                var rtcToKeep = [];
                for (var rtci = 0; rtci < memory.roomsToClaim.length; ++rtci) {
                    var rtc = memory.roomsToClaim[rtci];
                    var roomToClaim = pv.game.rooms[rtc.destination];
                    if (roomToClaim === undefined || pv.getMyStructuresByRoomAndType(roomToClaim, STRUCTURE_SPAWN).length == 0) {
                        var needClaimPart = (roomToClaim === undefined || !roomToClaim.controller.my);
                        pv.scheduleCreep(me, pv.makeClaimerOrder("claimer_" + rtc.destination, rtc.destination, rtc.path, needClaimPart), 2);
                        rtcToKeep.push(rtc);
                    }
                }
                for (var rtci = 0; rtci < rtcToKeep.length; ++rtci)
                    memory.roomsToClaim[rtci] = rtcToKeep[rtci];
                while (memory.roomsToClaim.length > rtcToKeep.length)
                    memory.roomsToClaim.pop();
            }
        }
    };
    return RoomWrapperImpl;
}());
function canBuild(me, structureType, pv) {
    var numExisting = pv.getMyStructuresByRoomAndType(me, structureType).length;
    return (CONTROLLER_STRUCTURES[structureType][me.controller.level] !== undefined
        &&
            CONTROLLER_STRUCTURES[structureType][me.controller.level] > numExisting);
}
function scheduleBuilderIfRequired(me, pv) {
    var builders = pv.getMyCreepsByRoomAndType(me, pv.CREEP_TYPE_BUILDER);
    if (builders.length == 0) {
        pv.scheduleCreep(me, pv.makeBuilderOrder(me.name + "_" + pv.CREEP_TYPE_BUILDER), 2);
    }
}
function isSourceWithoutContainer(sw, room, pv) {
    if (sw.source.room.name != room.name)
        return false;
    //skip sources close to lair before until you reach level 4
    var sourceMemory = pv.getSourceMemory(sw.source);
    if (sw.source.room.controller.level < 4 && pv.isCloseToLair(sw.source, sourceMemory))
        return false;
    //check memory
    var cid = sourceMemory.containerId;
    var inMemory = cid != "" && pv.getStructureById(cid).isPresent;
    //if not in memory, check map
    var isClose = inMemory;
    if (!isClose) {
        var containers = pv.getMyStructuresByRoomAndType(room, STRUCTURE_CONTAINER);
        var containersInRange = containers.filter(function (cw) {
            return pv.manhattan(sw.source.pos, cw.element.pos) < 3;
        });
        isClose = containersInRange.length > 0;
    }
    return !inMemory && !isClose;
}
function findSourceWithoutContainer(room, pv) {
    var sourcesWithoutContainers = pv.getMySources().filter(function (sw) { return isSourceWithoutContainer(sw, room, pv); });
    if (sourcesWithoutContainers.length == 0) {
        pv.log(["room", "findSourceWithoutContainer"], function () { return "room/findSourceWithoutContainer: All sources have containers in room " + room.name + "."; });
        return mopt.None();
    }
    else {
        pv.log(["room", "findSourceWithoutContainer"], function () { return "room/findSourceWithoutContainer: Source " + sourcesWithoutContainers[0].source.id + " is without container in room " + room.name; });
        return mopt.Some(sourcesWithoutContainers[0].source);
    }
}
function makeRoomWrapper(room) {
    return new RoomWrapperImpl(room);
}
exports.makeRoomWrapper = makeRoomWrapper;
