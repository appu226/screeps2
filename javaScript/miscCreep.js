"use strict";
var MiscCreepWrapper = (function () {
    function MiscCreepWrapper(creep, creepType) {
        this.creep = creep;
        this.creepType = creepType;
    }
    MiscCreepWrapper.prototype.process = function (pv) {
        this.creep.say("creep/MiscCreepWrapper/process: processing creep " + this.creep.name + " of type " + this.creepType + ".");
    };
    MiscCreepWrapper.prototype.pushEfficiency = function (efficiency) { };
    MiscCreepWrapper.prototype.getEfficiency = function () { return 0; };
    return MiscCreepWrapper;
}());
exports.MiscCreepWrapper = MiscCreepWrapper;
