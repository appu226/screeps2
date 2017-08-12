"use strict";
var o = require("./option");
var SourceWrapperImpl = (function () {
    function SourceWrapperImpl(s, pv) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    SourceWrapperImpl.prototype.process = function (pv) {
        var _this = this;
        if (!pv.isCloseToLair(this.source, this.memory) || this.source.room.controller.level >= 4) {
            var allCreeps = pv.getMyCreeps() // search all creeps
                .filter(function (cw) { return pv.isHarvesterWithSource(cw, _this.source.id); }); // that belong to this source
            if (allCreeps.length == 0 || o.sum(allCreeps.map(function (cw) { return pv.getEfficiency(cw.creep.memory); })) / allCreeps.length > .9) {
                pv.scheduleCreep(this.source.room.name, pv.makeHarvesterOrder("Harvester_" + this.source.id, this.source.id), 5);
            }
        }
    };
    return SourceWrapperImpl;
}());
function makeSourceWrapper(s, pv) {
    return new SourceWrapperImpl(s, pv);
}
exports.makeSourceWrapper = makeSourceWrapper;
function makeSourceMemory(source, pv) {
    return {
        id: source.id,
        isCloseToLair: pv.isCloseToLair(source, {}),
        containerId: ""
    };
}
exports.makeSourceMemory = makeSourceMemory;
