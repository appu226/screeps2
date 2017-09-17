"use strict";
var MiscCreepWrapper = (function () {
    function MiscCreepWrapper(creep, creepType) {
        this.element = creep;
        this.creepType = creepType;
        this.resourceRequests = [];
        this.memory = null;
    }
    MiscCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    MiscCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    MiscCreepWrapper.prototype.process = function (pv) {
        this.element.say("creep/MiscCreepWrapper/process: processing creep " + this.element.name + " of type " + this.creepType + ".");
    };
    MiscCreepWrapper.prototype.pushEfficiency = function (efficiency) { };
    MiscCreepWrapper.prototype.getEfficiency = function () { return 0; };
    return MiscCreepWrapper;
}());
exports.MiscCreepWrapper = MiscCreepWrapper;
