"use strict";
var RampartWrapper = (function () {
    function RampartWrapper(rampart) {
        this.element = rampart;
        this.my = rampart.my;
        this.resourceRequests = [];
    }
    RampartWrapper.prototype.process = function (pv) {
    };
    RampartWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot transfer energy to Rampart");
    };
    RampartWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from Rampart");
    };
    return RampartWrapper;
}());
function makeRampartWrapper(rampart) {
    return new RampartWrapper(rampart);
}
exports.makeRampartWrapper = makeRampartWrapper;
