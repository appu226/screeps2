"use strict";
var RampartWrapper = (function () {
    function RampartWrapper(rampart) {
        this.structure = rampart;
        this.my = rampart.my;
        this.resourceRequests = [];
    }
    RampartWrapper.prototype.process = function (pv) {
    };
    return RampartWrapper;
}());
function makeRampartWrapper(rampart) {
    return new RampartWrapper(rampart);
}
exports.makeRampartWrapper = makeRampartWrapper;
