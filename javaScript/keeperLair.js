"use strict";
var KeeperLairWrapper = (function () {
    function KeeperLairWrapper(keeperLair) {
        this.element = keeperLair;
        this.my = false;
        this.resourceRequests = [];
    }
    KeeperLairWrapper.prototype.process = function (pv) {
        ;
    };
    KeeperLairWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot ask keeper lair to give energy to creep.");
    };
    KeeperLairWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("Attempted to give energy to keeper lair.");
    };
    return KeeperLairWrapper;
}());
function makeKeeperLairWrapper(keeperLair) {
    return new KeeperLairWrapper(keeperLair);
}
exports.makeKeeperLairWrapper = makeKeeperLairWrapper;
