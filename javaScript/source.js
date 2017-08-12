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
                .filter(function (cw) { return pv.isHarvesterWithSource(cw, _this.source.id); }); // that belong to this source
            var numCollectionSlots = getNumCollectionSlots(this.source, pv);
            var isCollectionSpotEmpty = allCreeps.length < numCollectionSlots;
            var fullButCreepAboutToDie = numCollectionSlots == allCreeps.length && allCreeps.filter(function (cw) { return cw.creep.ticksToLive < 100; }).length > 0;
            if (areSpawnsFree(this.source.room, pv) && (isCollectionSpotEmpty || fullButCreepAboutToDie)) {
                pv.scheduleCreep(this.source.room.name, pv.makeHarvesterOrder("Harvester_" + this.source.id, this.source.id), 5);
            }
        }
    };
    return SourceWrapperImpl;
}());
function areSpawnsFree(room, pv) {
    return pv.getMyStructuresByRoomAndType(room, STRUCTURE_SPAWN).filter(function (sw) {
        return sw.structure.spawning != null;
    }).length == 0;
}
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
        var pmp_1 = pv.getPossibleMoveSites(source.room);
        var xs = [source.pos.x - 1, source.pos.x, source.pos.x + 1];
        var ys_1 = [source.pos.y - 1, source.pos.y, source.pos.y + 1];
        var numCollectionSlots_1 = 0;
        xs.forEach(function (x) {
            ys_1.forEach(function (y) {
                if (x >= 0 && x < pmp_1.length && y >= 0 && y < pmp_1[x].length && pmp_1[x][y])
                    numCollectionSlots_1++;
            });
        });
        mem.numCollectionSlots = numCollectionSlots_1;
    }
    return mem.numCollectionSlots;
}
