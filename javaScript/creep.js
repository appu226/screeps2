"use strict";
var o = require("./option");
function moveCreep(cw, pos, pv) {
    return cw.creep.moveTo(pos) == OK;
}
exports.moveCreep = moveCreep;
function makeCreepWrapper(c, pv) {
    switch (c.memory.creepType) {
        case pv.CREEP_TYPE_BUILDER:
            return new BuilderCreepWrapper(c, pv);
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
        if (i == 0 || comboString[i] == delim[0]) {
            result.push("");
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
        case pv.CREEP_TYPE_TRANSPORTER: return makeTransporterOrder(orderName, tokenize(orderName, "_")[1], pv);
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
//---------------- TRANSPORTER ----------------------
function makeTransporterOrder(orderName, roomName, pv) {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        name: pv.CREEP_TYPE_TRANSPORTER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
        addOnBody: [MOVE, CARRY],
        maxEnergy: 3000,
        memory: makeTransporterMemory(roomName, pv)
    };
}
function makeTransporterMemory(roomName, pv) {
    return {
        roomName: roomName,
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    };
}
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
                pv.scheduleCreep(this.creep.room.name, pv.CREEP_TYPE_TRANSPORTER + "_" + this.creep.room.name, pv.CREEP_TYPE_TRANSPORTER, .5);
            }
        }
    };
    HarvesterCreepWrapper.prototype.pushEfficiency = function (efficiency) {
        pushEfficiency(this.memory, efficiency);
    };
    HarvesterCreepWrapper.prototype.getEfficiency = function () {
        return getEfficiency(this.memory);
    };
    return HarvesterCreepWrapper;
}());
