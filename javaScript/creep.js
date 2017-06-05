"use strict";
var o = require("./option");
function moveCreep(cw, pos, pv) {
    return cw.creep.moveTo(pos) == OK;
}
exports.moveCreep = moveCreep;
function makeCreepWrapper(c, pv) {
    if (!c.my)
        return new MiscCreepWrapper(c, pv.CREEP_TYPE_FOREIGNER);
    switch (c.memory.creepType) {
        case pv.CREEP_TYPE_BUILDER:
            return new BuilderCreepWrapper(c, pv);
        case pv.CREEP_TYPE_HARVESTER:
            return new HarvesterCreepWrapper(c, pv);
        case pv.CREEP_TYPE_TRANSPORTER:
            return new TransporterCreepWrapper(c, pv);
        case pv.CREEP_TYPE_UPGRADER:
            return new UpgraderCreepWrapper(c, pv);
        default:
            pv.log.error("makeCreepWrapper: creep " + c.name + " of type " + c.memory.creepType + " not yet supported.");
            return new MiscCreepWrapper(c, c.memory.creepType);
    }
}
exports.makeCreepWrapper = makeCreepWrapper;
function tokenize(comboString, delim) {
    var i = 0;
    var result = [];
    while (i < comboString.length) {
        if (comboString[i] == delim[0]) {
            result.push("");
        }
        else if (i == 0) {
            result.push(comboString[i].toString());
        }
        else {
            result[result.length - 1] += comboString[i];
        }
        ++i;
    }
    return result;
}
function makeCreepOrder(orderName, creepType, pv) {
    switch (creepType) {
        case pv.CREEP_TYPE_BUILDER: return makeBuilderOrder(orderName, pv);
        case pv.CREEP_TYPE_HARVESTER: return makeHarvesterOrder(orderName, tokenize(orderName, "_")[1], pv);
        case pv.CREEP_TYPE_TRANSPORTER: return makeTransporterOrder(orderName, pv);
        case pv.CREEP_TYPE_UPGRADER: return makeUpgraderOrder(orderName, tokenize(orderName, "_")[1], pv);
        default: throw new Error("creep/makeCreepOrder: creepType " + creepType + " not yet supported.");
    }
}
exports.makeCreepOrder = makeCreepOrder;
//---------------- COMMON UTILS ---------------------
function pushEfficiency(memory, efficiency, maxSize) {
    if (maxSize === void 0) { maxSize = 50; }
    var eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
    eq.push(efficiency);
    memory.totalEfficiency += efficiency;
    while (eq.length() > maxSize && maxSize >= 0) {
        memory.totalEfficiency -= eq.pop().get;
    }
}
function getEfficiency(memory) {
    var eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
    if (eq.isEmpty())
        return 0;
    else
        return memory.totalEfficiency / eq.length();
}
//---------------- UPGRADER -------------------------
function makeUpgraderOrder(orderName, roomName, pv) {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: pv.CREEP_TYPE_UPGRADER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [MOVE, MOVE, CARRY, WORK],
        maxEnergy: 3000,
        memory: makeUpgraderMemory(roomName, pv)
    };
}
function makeUpgraderMemory(roomName, pv) {
    return {
        roomName: roomName,
        creepType: pv.CREEP_TYPE_UPGRADER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
var UpgraderCreepWrapper = (function () {
    function UpgraderCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = creep.memory;
    }
    UpgraderCreepWrapper.prototype.process = function (pv) {
        var roomName = this.memory.roomName;
        var room = Game.rooms[roomName];
        if (room === undefined) {
            this.pushEfficiency(0);
            throw new Error(this.creep.name + " could not find room " + roomName);
        }
        var creep = this.creep;
        var controller = room.controller;
        var upgradeResult = creep.upgradeController(controller);
        switch (upgradeResult) {
            case OK: {
                this.pushEfficiency(1);
                break;
            }
            case ERR_NOT_IN_RANGE: {
                this.pushEfficiency(moveCreep(this, controller.pos, pv) ? 1 : 0);
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY: {
                this.pushEfficiency(0);
                break;
            }
            default: {
                this.pushEfficiency(0);
                throw new Error(creep.name + " upgrading " + roomName + " failed with code " + upgradeResult + ".");
            }
        }
        pv.requestResourceReceive(this.creep.room.name, this.creep.id, true, RESOURCE_ENERGY, this.creep.carryCapacity - this.creep.carry.energy);
    };
    UpgraderCreepWrapper.prototype.pushEfficiency = function (efficiency) {
        pushEfficiency(this.memory, efficiency);
    };
    UpgraderCreepWrapper.prototype.getEfficiency = function () {
        return getEfficiency(this.memory);
    };
    return UpgraderCreepWrapper;
}());
//---------------- TRANSPORTER ----------------------
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
                this.pushEfficiency(0);
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
            moveCreep(this, newPos, pv);
        }
        this.pushEfficiency(0);
    };
    TransporterCreepWrapper.prototype.collecting = function (pv) {
        var creep = this.creep;
        var memory = this.memory;
        var collectionStatus = 0;
        var sourceObject = null;
        switch (memory.sourceType) {
            case "creep": {
                var sourceCreep = pv.game.getObjectById(memory.sourceId);
                collectionStatus = sourceCreep.transfer(creep, memory.resourceType);
                sourceObject = sourceCreep;
                break;
            }
            case "structure": {
                var sourceStructure = pv.game.getObjectById(memory.sourceId);
                collectionStatus = creep.withdraw(sourceStructure, memory.resourceType);
                sourceObject = sourceStructure;
                break;
            }
            default: {
                this.pushEfficiency(0);
                throw new Error("Unexpected sourceType \"" + memory.sourceType + "\", expecting \"creep\" or \"structure\"");
            }
        }
        switch (collectionStatus) {
            case ERR_NOT_IN_RANGE: {
                this.pushEfficiency(moveCreep(this, sourceObject.pos, pv) ? 1 : 0);
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_NOT_ENOUGH_RESOURCES:
            case OK: {
                if (creep.carry[memory.resourceType] > 0) {
                    pv.log.debug(creep.name + " status changing to transporting.");
                    memory.status = "transporting";
                    this.pushEfficiency(1);
                }
                break;
            }
            default: {
                this.pushEfficiency(0);
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
            this.pushEfficiency(1);
            return;
        }
        var destination = pv.game.getObjectById(memory.destinationId);
        var transferResult = creep.transfer(destination, memory.resourceType);
        if (transferResult == ERR_NOT_IN_RANGE) {
            this.pushEfficiency(moveCreep(this, destination.pos, pv) ? 1 : 0);
        }
        else if (transferResult == OK) {
            this.pushEfficiency(1);
        }
        else {
            this.pushEfficiency(0);
        }
    };
    TransporterCreepWrapper.prototype.pushEfficiency = function (efficiency) {
        pushEfficiency(this.memory, efficiency);
    };
    TransporterCreepWrapper.prototype.getEfficiency = function () {
        return getEfficiency(this.memory);
    };
    return TransporterCreepWrapper;
}());
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
//---------------- BUILDER --------------------------
function makeBuilderOrder(orderName, pv) {
    return {
        creepType: pv.CREEP_TYPE_BUILDER,
        name: pv.CREEP_TYPE_BUILDER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, CARRY, CARRY],
        addOnBody: [MOVE, CARRY, WORK, CARRY],
        maxEnergy: 1000,
        memory: makeBuilderMemory(pv)
    };
}
function makeBuilderMemory(pv) {
    return {
        constructionSiteId: o.None(),
        creepType: pv.CREEP_TYPE_BUILDER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
var BuilderCreepWrapper = (function () {
    function BuilderCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_BUILDER;
        this.memory = creep.memory;
    }
    BuilderCreepWrapper.prototype.process = function (pv) {
        var cs = null;
        if (this.memory.constructionSiteId !== undefined && this.memory.constructionSiteId.isPresent) {
            cs = pv.game.getObjectById(this.memory.constructionSiteId.get);
        }
        if (cs == null) {
            var constructionSites = pv.getConstructionSitesFromRoom(this.creep.room);
            if (constructionSites.length == 0) {
                pv.constructNextSite(this.creep.room);
            }
            else {
                cs = constructionSites[0];
            }
        }
        if (cs != null) {
            var buildAttempt = this.creep.build(cs);
            if (buildAttempt == ERR_NOT_IN_RANGE) {
                moveCreep(this, cs.pos, pv);
                this.pushEfficiency(0);
            }
            else if (buildAttempt == OK) {
                this.pushEfficiency(1);
            }
            else {
                this.pushEfficiency(0);
            }
            this.memory.constructionSiteId = o.Some(cs.id);
        }
        else {
            this.pushEfficiency(0);
            this.memory.constructionSiteId = o.None();
        }
        pv.requestResourceReceive(this.creep.room.name, this.creep.id, true, RESOURCE_ENERGY, this.creep.carryCapacity - this.creep.carry.energy);
    };
    BuilderCreepWrapper.prototype.pushEfficiency = function (efficiency) {
        pushEfficiency(this.memory, efficiency);
    };
    BuilderCreepWrapper.prototype.getEfficiency = function () {
        return getEfficiency(this.memory);
    };
    return BuilderCreepWrapper;
}());
//-------------------- MISC --------------------------------
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
//------------------- HARVESTER ------------------------------
function isHarvesterWithSource(creepWrapper, sourceId, pv) {
    return creepWrapper.creepType == pv.CREEP_TYPE_HARVESTER &&
        creepWrapper.memory.sourceId == sourceId;
}
exports.isHarvesterWithSource = isHarvesterWithSource;
function makeHarvesterOrder(orderName, sourceId, pv) {
    return {
        creepType: pv.CREEP_TYPE_HARVESTER,
        name: pv.CREEP_TYPE_HARVESTER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [CARRY, WORK, WORK],
        maxEnergy: 1000,
        memory: makeHarvesterMemory(sourceId, pv)
    };
}
function makeHarvesterMemory(sourceId, pv) {
    return {
        sourceId: sourceId,
        creepType: pv.CREEP_TYPE_HARVESTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
var HarvesterCreepWrapper = (function () {
    function HarvesterCreepWrapper(creep, pv) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = creep.memory;
    }
    HarvesterCreepWrapper.prototype.roomHasTransporters = function (pv) {
        var _this = this;
        return pv.getMyCreeps().filter(function (cw) {
            return cw.creepType == pv.CREEP_TYPE_TRANSPORTER &&
                cw.creep.room.name == _this.creep.room.name;
        }).length > 0;
    };
    HarvesterCreepWrapper.prototype.process = function (pv) {
        var _this = this;
        if (this.creep.carry.energy < this.creep.carryCapacity) {
            var source = pv.game.getObjectById(this.memory.sourceId);
            var harvestAttempt = this.creep.harvest(source);
            if (harvestAttempt == ERR_NOT_IN_RANGE) {
                this.pushEfficiency(0);
                moveCreep(this, source.pos, pv);
            }
            else if (source.energy == 0) {
                this.pushEfficiency(0);
            }
            else {
                this.pushEfficiency(1);
            }
        }
        else {
            this.pushEfficiency(0);
            if (!this.roomHasTransporters(pv)) {
                var spawns = pv.getMyStructures().filter(function (sw) {
                    return sw.structure.structureType == STRUCTURE_SPAWN &&
                        sw.structure.room.name == _this.creep.room.name;
                });
                if (spawns.length > 0) {
                    var spawn = spawns[0].structure;
                    if (this.creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        moveCreep(this, spawn.pos, pv);
                    }
                }
            }
        }
        pv.requestResourceSend(this.creep.room.name, this.creep.id, true, RESOURCE_ENERGY, this.creep.carry.energy);
    };
    HarvesterCreepWrapper.prototype.pushEfficiency = function (efficiency) {
        pushEfficiency(this.memory, efficiency);
    };
    HarvesterCreepWrapper.prototype.getEfficiency = function () {
        return getEfficiency(this.memory);
    };
    return HarvesterCreepWrapper;
}());
