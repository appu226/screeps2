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
        var creep = this.creep;
        var terrain = pv.getTerrainWithStructures(creep.room);
        var validMoves = [];
        var checkForObstacle = function (dx, dy) {
            var x = creep.pos.x + dx;
            var y = creep.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49)
                return true;
            if (terrain[x][y] != pv.TERRAIN_CODE_PLAIN && terrain[x][y] != pv.TERRAIN_CODE_SWAMP) {
                return true;
            }
            validMoves.push({ x: x, y: y });
            return false;
        };
        var downObs = checkForObstacle(0, 1);
        var leftObs = checkForObstacle(-1, 0);
        var rightObs = checkForObstacle(1, 0);
        var upObs = checkForObstacle(0, -1);
        var nextToObstacle = upObs || downObs || leftObs || rightObs;
        if (nextToObstacle && validMoves.length > 0) {
            var randomValidMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            var newPos = creep.room.getPositionAt(randomValidMove.x, randomValidMove.y);
            pv.moveCreep(this, newPos);
        }
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
            pv.log.debug(creep.name + " status changing to free.");
            memory.status = "free";
            pv.pushEfficiency(memory, 1);
            return;
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
        else {
            pv.pushEfficiency(memory, 0);
        }
    };
    return TransporterCreepWrapper;
}());
exports.TransporterCreepWrapper = TransporterCreepWrapper;
function isTransporterReceivingFrom(creepWrapper, sourceId, resourceType, pv) {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        return false;
    var tcw = creepWrapper;
    return (tcw.memory.sourceId == sourceId && tcw.memory.resourceType == resourceType);
}
exports.isTransporterReceivingFrom = isTransporterReceivingFrom;
function isTransporterSendingTo(creepWrapper, destinationId, resourceType, pv) {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        return false;
    var tcw = creepWrapper;
    return (tcw.memory.destinationId == destinationId && tcw.memory.resourceType == resourceType);
}
exports.isTransporterSendingTo = isTransporterSendingTo;
function isFreeTransporter(creepWrapper, pv) {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        return false;
    var tcw = creepWrapper;
    return tcw.memory.status == "free";
}
exports.isFreeTransporter = isFreeTransporter;
function assignTransporter(creepWrapper, sourceRequest, destinationRequest, pv) {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        throw new Error("assignTransporter: expected creep wrapper with type CREEP_TYPE_TRANSPORTER (" + pv.CREEP_TYPE_TRANSPORTER + "), got " + creepWrapper.creepType);
    var tcw = creepWrapper;
    tcw.memory.destinationId = destinationRequest.requestorId;
    tcw.memory.destinationType = destinationRequest.isRequestorCreep ? "creep" : "structure";
    tcw.memory.resourceType = sourceRequest.resourceType;
    tcw.memory.sourceId = sourceRequest.requestorId;
    tcw.memory.sourceType = sourceRequest.isRequestorCreep ? "creep" : "structure";
    tcw.memory.status = "collecting";
}
exports.assignTransporter = assignTransporter;
