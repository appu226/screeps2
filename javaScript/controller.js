"use strict";
var o = require("./option");
var ControllerWrapper = (function () {
    function ControllerWrapper(controller) {
        this.structure = controller;
        this.my = controller.my;
    }
    ControllerWrapper.prototype.process = function (pv) {
        if (!this.my)
            return;
        var roomName = this.structure.room.name;
        var upgraders = pv.getMyCreepsByRoomAndType(this.structure.room, pv.CREEP_TYPE_UPGRADER);
        var totalEfficiency = o.sum(upgraders.map(function (cw) { return pv.getEfficiency(cw.creep.memory); }));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0) {
            pv.log.debug("Scheduling upgrader for room " + roomName);
            pv.scheduleCreep(roomName, pv.makeUpgraderOrder("Upgrader_" + roomName, roomName), 2);
        }
        else {
            pv.removeCreepOrder(roomName, "Upgrader_" + roomName);
        }
    };
    return ControllerWrapper;
}());
function makeControllerWrapper(controller) {
    return new ControllerWrapper(controller);
}
exports.makeControllerWrapper = makeControllerWrapper;
