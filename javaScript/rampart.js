"use strict";
var RampartWrapper = (function () {
    function RampartWrapper(rampart, pv) {
        this.structure = rampart;
        this.my = rampart.my;
    }
    RampartWrapper.prototype.process = function (pv) {
    };
    return RampartWrapper;
}());
function makeRampartWrapper(rampart, pv) {
    return new RampartWrapper(rampart, pv);
}
exports.makeRampartWrapper = makeRampartWrapper;
