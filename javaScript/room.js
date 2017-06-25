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
                pv.scheduleCreep(me.name, pv.makeTransporterOrder("Transporter_" + me.name), 4);
            }
            var hostileCreeps = pv.getHostileCreeps(me);
            for (var hci = 0; hci < hostileCreeps.length; ++hci) {
                var hc = hostileCreeps[hci];
                if (pv.getTotalCollectedDefense(hc.id) < pv.getSoldierCapability(hc)) {
                    pv.scheduleCreep(me.name, pv.makeDefenderOrder("defender_" + me.name + "_" + hc.id, hc.id), 2);
                }
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
        pv.scheduleCreep(me.name, pv.makeBuilderOrder(me.name + "_" + pv.CREEP_TYPE_BUILDER), 2);
    }
}
function scheduleConstructionSitesIfRequired(room, pv, structureType) {
    var alreadyAvailable = pv.getMyStructures().filter(function (sw) { return sw.my && sw.structure.room.name == room.name && sw.structure.structureType == structureType; });
    var possibleConstructionSites = pv.getPossibleConstructionSites(room);
    var plannedConstructionSites = pv.getPlannedConstructionSites(room.name).filter(function (pcs) { return pcs.structureType == structureType && possibleConstructionSites[pcs.x][pcs.y]; });
    if (plannedConstructionSites.length == 0 // nothing planned 
        || alreadyAvailable.length >= plannedConstructionSites.length // more created than planned
        || alreadyAvailable.length >= CONTROLLER_STRUCTURES[structureType][room.controller.level] // cannot create more
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
