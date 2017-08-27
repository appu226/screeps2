"use strict";
var SourceWrapperImpl = (function () {
    function SourceWrapperImpl(s, pv) {
        this.source = s;
        this.memory = pv.getSourceMemory(s);
    }
    SourceWrapperImpl.prototype.process = function (pv) {
        var _this = this;
        if (!pv.isCloseToLair(this.source, this.memory) || this.source.room.controller.level >= 4) {
            var allCreeps = pv.getMyCreeps() // search all creeps
                .filter(function (cw) { return pv.isHarvesterWithSource(cw, _this.source.id) && cw.element.ticksToLive > 50; }); // that belong to this source
            var numCollectionSlots = getNumCollectionSlots(this.source, pv);
            var isCollectionSpotEmpty = allCreeps.length < numCollectionSlots;
            var harvestingCapacity = allCreeps.reduce(function (acc, cw) { return acc + cw.element.getActiveBodyparts(WORK); }, 0);
            if (isCollectionSpotEmpty && harvestingCapacity < 12) {
                pv.scheduleCreep(this.source.room, pv.makeHarvesterOrder("Harvester_" + this.source.id, this.source.id), 5);
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
        containerId: "",
        numCollectionSlots: -1
    };
}
exports.makeSourceMemory = makeSourceMemory;
function getNumCollectionSlots(source, pv) {
    var mem = pv.getSourceMemory(source);
    if (mem.numCollectionSlots === undefined || mem.numCollectionSlots == -1) {
        var pcs_1 = pv.getPossibleCollectionSites(source.room);
        var xs = [source.pos.x - 1, source.pos.x, source.pos.x + 1];
        var ys_1 = [source.pos.y - 1, source.pos.y, source.pos.y + 1];
        var numCollectionSlots_1 = 0;
        xs.forEach(function (x) {
            ys_1.forEach(function (y) {
                if (x >= 0 && x < pcs_1.length && y >= 0 && y < pcs_1[x].length && pcs_1[x][y])
                    numCollectionSlots_1++;
            });
        });
        mem.numCollectionSlots = numCollectionSlots_1;
    }
    return mem.numCollectionSlots;
}
