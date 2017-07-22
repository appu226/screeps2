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
            if (pv.getConstructionSitesFromRoom(me).length > 0) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            }
            else {
                var bannedStructures = {
                    "road": true,
                    "constructedWall": true,
                    "rampart": true,
                    "link": true
                };
                //schedule next construction site
                for (var structureType in CONTROLLER_STRUCTURES) {
                    var numExisting = pv.getMyStructuresByRoomAndType(me, structureType).length;
                    if (bannedStructures[structureType] != true &&
                        CONTROLLER_STRUCTURES[structureType][me.controller.level] != undefined &&
                        CONTROLLER_STRUCTURES[structureType][me.controller.level] > numExisting) {
                        pv.constructNextSite(me, structureType);
                        break;
                    }
                }
            }
            if (pv.getTransporterEfficiency(me) > .9) {
                pv.scheduleCreep(me.name, pv.makeTransporterOrder("Transporter_" + me.name), 4);
            }
            var hostileCreeps = pv.getHostileCreepsInRoom(me);
            for (var hci = 0; hci < hostileCreeps.length; ++hci) {
                var hc = hostileCreeps[hci];
                if (hc.owner.username == "Source Keeper")
                    continue;
                if (pv.getTotalCollectedDefense(hc.id) < pv.getSoldierCapability(hc)) {
                    pv.scheduleCreep(me.name, pv.makeDefenderOrder("defender_" + me.name + "_" + hc.id, hc.id), 2);
                }
            }
        }
    };
    return RoomWrapperImpl;
}());
function scheduleBuilderIfRequired(me, pv) {
    var builders = pv.getMyCreepsByRoomAndType(me, pv.CREEP_TYPE_BUILDER);
    if (builders.length == 0) {
        pv.scheduleCreep(me.name, pv.makeBuilderOrder(me.name + "_" + pv.CREEP_TYPE_BUILDER), 2);
    }
}
function makeRoomWrapper(room) {
    return new RoomWrapperImpl(room);
}
exports.makeRoomWrapper = makeRoomWrapper;
