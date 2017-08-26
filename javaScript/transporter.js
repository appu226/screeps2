"use strict";
function makeTransporterOrder(orderName, pv) {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        name: pv.CREEP_TYPE_TRANSPORTER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
        addOnBody: [MOVE, CARRY],
        maxEnergy: 3000,
        memory: makeTransporterMemory(pv)
    };
}
exports.makeTransporterOrder = makeTransporterOrder;
function makeTransporterMemory(pv) {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0,
        sourceId: "",
        sourceType: "",
        destinationId: "",
        destinationType: "",
        resourceType: "",
        status: "free"
    };
}
var TransporterCreepWrapper = (function () {
    function TransporterCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = creep.memory;
        this.resourceRequests = [];
    }
    TransporterCreepWrapper.prototype.process = function (pv) {
        switch (this.memory.status) {
            case "free": return this.free(pv);
            case "collecting": return this.collecting(pv);
            case "transporting": return this.transporting(pv);
            default: {
                pv.log.error("Creep " + this.creep.name + " has unrecognized status " + this.memory.status);
                this.memory.status = "free";
                pv.pushEfficiency(this.memory, 0);
                return;
            }
        }
    };
    TransporterCreepWrapper.prototype.free = function (pv) {
        pv.avoidObstacle(this);
        pv.pushEfficiency(this.memory, 0);
    };
    TransporterCreepWrapper.prototype.failAndResetToFree = function (reason, pv) {
        this.memory.status = "free";
        pv.log.debug(reason);
        pv.pushEfficiency(this.memory, 0);
    };
    TransporterCreepWrapper.prototype.collecting = function (pv) {
        var creep = this.creep;
        var memory = this.memory;
        var collectionStatus = 0;
        var sourceObject = null;
        switch (memory.sourceType) {
            case "creep": {
                var sourceCreep = pv.game.getObjectById(memory.sourceId);
                if (sourceCreep == null)
                    return this.failAndResetToFree("Freeing transporter " + creep.name + " because it couldn't find source " + memory.sourceId, pv);
                collectionStatus = sourceCreep.transfer(creep, memory.resourceType);
                if (sourceCreep.carry[memory.resourceType] == 0) {
                    collectionStatus = ERR_NOT_ENOUGH_ENERGY;
                }
                sourceObject = sourceCreep;
                break;
            }
            case "structure": {
                var sourceStructure = pv.game.getObjectById(memory.sourceId);
                if (sourceStructure == null)
                    return this.failAndResetToFree("Freeing transporter " + creep.name + " because it couldn't find source " + memory.sourceId, pv);
                collectionStatus = creep.withdraw(sourceStructure, memory.resourceType);
                sourceObject = sourceStructure;
                break;
            }
            default: {
                pv.pushEfficiency(memory, 0);
                throw new Error("Unexpected sourceType \"" + memory.sourceType + "\", expecting \"creep\" or \"structure\"");
            }
        }
        switch (collectionStatus) {
            case ERR_NOT_IN_RANGE: {
                pv.pushEfficiency(memory, pv.moveCreep(this, sourceObject.pos) ? 1 : 0);
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_NOT_ENOUGH_RESOURCES:
            case ERR_FULL:
            case OK: {
                if (creep.carry[memory.resourceType] > 0) {
                    pv.log.debug(creep.name + " status changing to transporting.");
                    memory.status = "transporting";
                    pv.pushEfficiency(memory, 1);
                }
                break;
            }
            default: {
                pv.pushEfficiency(memory, 0);
                break;
            }
        }
    };
    TransporterCreepWrapper.prototype.transporting = function (pv) {
        var creep = this.creep;
        var memory = this.memory;
        if (creep.carry[memory.resourceType] == 0) {
            return this.succeedAndSetToFree(pv);
        }
        var destination = pv.game.getObjectById(memory.destinationId);
        if (destination == null)
            return this.failAndResetToFree("Freeing transporter " + this.creep.name + " because it couldn't find destination " + memory.destinationId, pv);
        var transferResult = creep.transfer(destination, memory.resourceType);
        if (transferResult == ERR_NOT_IN_RANGE) {
            pv.pushEfficiency(memory, pv.moveCreep(this, destination.pos) ? 1 : 0);
        }
        else if (transferResult == OK) {
            pv.pushEfficiency(memory, 1);
        }
        else if (transferResult == ERR_FULL) {
            if (creep.carry[memory.resourceType] >= 50) {
                this.giveToClosestExtension(creep, memory, pv);
            }
            else
                this.succeedAndSetToFree(pv);
        }
        else {
            pv.pushEfficiency(memory, 0);
        }
    };
    TransporterCreepWrapper.prototype.succeedAndSetToFree = function (pv) {
        pv.log.debug(this.creep.name + " status changing to free.");
        this.memory.status = "free";
        pv.pushEfficiency(this.memory, 1);
    };
    TransporterCreepWrapper.prototype.giveToClosestExtension = function (creep, memory, pv) {
        var emptyExtensions = pv.getMyStructuresByRoomAndType(creep.room, STRUCTURE_EXTENSION).map(function (sw) { return sw.structure; }).filter(function (se) { return se.energy < se.energyCapacity; });
        if (emptyExtensions.length == 0)
            this.succeedAndSetToFree(pv);
        else {
            var closestEmptyExtension = creep.pos.findClosestByRange(emptyExtensions);
            memory.destinationType = "structure";
            memory.destinationId = closestEmptyExtension.id;
            pv.log.debug(this.creep.name + " status changing destination to extension " + closestEmptyExtension.id + ".");
            pv.pushEfficiency(memory, 1);
        }
    };
    return TransporterCreepWrapper;
}());
exports.TransporterCreepWrapper = TransporterCreepWrapper;
function isFreeTransporter(creepWrapper, pv) {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        return false;
    var tcw = creepWrapper;
    return tcw.memory.status == "free";
}
exports.isFreeTransporter = isFreeTransporter;
