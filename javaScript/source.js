"use strict";
var SourceWrapperImpl = (function () {
    function SourceWrapperImpl(s, pv) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    SourceWrapperImpl.prototype.process = function (pv) {
        var _this = this;
        var allCreeps = pv.getMyCreeps() // search all creeps
            .filter(function (cw) { return pv.isHarvesterWithSource(cw, _this.source.id); }); // that belong to this source
        if (allCreeps.length == 0) {
            pv.scheduleCreep(this.source.room.name, "Harvester_" + this.source.id, pv.CREEP_TYPE_HARVESTER, 1);
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
        id: source.id
    };
}
exports.makeSourceMemory = makeSourceMemory;
