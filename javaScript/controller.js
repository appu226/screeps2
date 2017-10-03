"use strict";
var o = require("./option");
var ControllerWrapper = (function () {
    function ControllerWrapper(controller) {
        this.element = controller;
        this.my = controller.my;
        this.resourceRequests = [];
    }
    ControllerWrapper.prototype.process = function (pv) {
        if (!this.my)
            return;
        var roomName = this.element.room.name;
        var upgraders = pv.getMyCreepsByRoomAndType(this.element.room, pv.CREEP_TYPE_UPGRADER).filter(function (cw) { return cw.element.ticksToLive > 50; });
        var totalEfficiency = o.sum(upgraders.map(function (cw) { return pv.getEfficiency(cw.element.memory); }));
        var upgradeCapacity = o.sum(upgraders.map(function (cw) { return cw.element.getActiveBodyparts(WORK); }));
        if (totalEfficiency >= upgraders.length * 90.0 / 100.0 && upgradeCapacity < 15) {
            pv.log(["controller", "process", "scheduleCreep"], function () { return "controller.ts/ControllerWrapper.process: Scheduling upgrader for room " + roomName; });
            pv.scheduleCreep(this.element.room, pv.makeUpgraderOrder("Upgrader_" + roomName, roomName), 2);
        }
        else {
            pv.removeCreepOrder(roomName, "Upgrader_" + roomName);
        }
    };
    ControllerWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Controller " + this.element.id + " cannot give resource to creep.");
    };
    ControllerWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return ControllerWrapper;
}());
function makeControllerWrapper(controller) {
    return new ControllerWrapper(controller);
}
exports.makeControllerWrapper = makeControllerWrapper;
