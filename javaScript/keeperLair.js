"use strict";
var KeeperLairWrapper = (function () {
    function KeeperLairWrapper(keeperLair) {
        this.structure = keeperLair;
        this.my = false;
    }
    KeeperLairWrapper.prototype.process = function (pv) {
        ;
    };
    return KeeperLairWrapper;
}());
function makeKeeperLairWrapper(keeperLair) {
    return new KeeperLairWrapper(keeperLair);
}
exports.makeKeeperLairWrapper = makeKeeperLairWrapper;
