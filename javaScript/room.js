"use strict";
var RoomWrapperImpl = (function () {
    function RoomWrapperImpl(room) {
        this.room = room;
    }
    RoomWrapperImpl.prototype.process = function (pv) {
        var me = this.room;
        if (me.controller.my) {
            //remove stale creep orders.
            var pq = pv.getCreepOrders(me.name);
            while (!pq.isEmpty && pv.game.creeps[pq.peek().get.name] !== undefined) {
                pq.pop();
            }
            // check if construction sites already exist
            var doConstructionSitesExist = pv.getConstructionSitesFromRoom(me).filter(function (cs) { return cs.my; }).length > 0;
            if (doConstructionSitesExist) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            }
            else {
                //if no construction sites, check if we need any
                var scheduled = scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_ROAD)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_WALL)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_TOWER)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_EXTENSION);
                if (scheduled) {
                    pv.log.debug("Scheduled structure in room " + me.name);
                }
            }
            if (pv.getTransporterEfficiency(me) > .9) {
                pv.scheduleCreep(me.name, "Transpoter_" + me.name, pv.CREEP_TYPE_TRANSPORTER, .1);
            }
        }
    };
    return RoomWrapperImpl;
}());
function scheduleBuilderIfRequired(me, pv) {
    var builders = pv.getMyCreeps().filter(function (cw) {
        return cw.creep.my
            && cw.creep.room.name == me.name
            && cw.creepType == pv.CREEP_TYPE_BUILDER;
    });
    if (builders.length == 0) {
        pv.scheduleCreep(me.name, me.name + "_" + pv.CREEP_TYPE_BUILDER, pv.CREEP_TYPE_BUILDER, 5);
    }
}
function scheduleConstructionSitesIfRequired(room, pv, structureType) {
    var terrain = pv.getTerrainWithStructures(room);
    var structureCode = pv.getStructureCode(structureType);
    var alreadyAvailable = terrain.reduce(function (prev, current) {
        return current.reduce(function (prev2, curr2) { return curr2 == structureCode ? prev2 + 1 : prev2; }, prev);
    }, 0);
    var plannedConstructionSites = pv.getPlannedConstructionSites(room.name).filter(function (pcs) {
        var t = terrain[pcs.x][pcs.y];
        return (t == pv.TERRAIN_CODE_SWAMP || t == pv.TERRAIN_CODE_PLAIN)
            && pcs.structureType == structureType;
    });
    if (plannedConstructionSites.length == 0 // nothing planned 
        || alreadyAvailable >= plannedConstructionSites.length // more created than planned
        || alreadyAvailable >= CONTROLLER_STRUCTURES[structureType][room.controller.level] // cannot create more
    ) {
        return false;
    }
    else {
        var pcs = plannedConstructionSites[0];
        return room.createConstructionSite(pcs.x, pcs.y, structureType) == OK;
    }
}
function makeRoomWrapper(room) {
    return new RoomWrapperImpl(room);
}
exports.makeRoomWrapper = makeRoomWrapper;
