"use strict";
var MiscStructureWrapper = (function () {
    function MiscStructureWrapper(structure, pv) {
        this.element = structure;
        this.my = structure.my === undefined ? true : structure.my;
        this.resourceRequests = [];
    }
    MiscStructureWrapper.prototype.process = function (pv) {
    };
    MiscStructureWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot deal with miscStructure");
    };
    MiscStructureWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot deal with miscStructure");
    };
    return MiscStructureWrapper;
}());
function makeMiscStructureWrapper(structure, pv) {
    return new MiscStructureWrapper(structure, pv);
}
exports.makeMiscStructureWrapper = makeMiscStructureWrapper;
