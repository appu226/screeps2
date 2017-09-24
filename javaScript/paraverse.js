"use strict";
var dictionary = require("./dictionary");
var mstructure = require("./structure");
var mMiscCreep = require("./miscCreep");
var mtransporter = require("./transporter");
var mbuilder = require("./builder");
var mharvester = require("./harvester");
var mupgrader = require("./upgrader");
var mdefender = require("./defender");
var mclaimer = require("./claimer");
var source = require("./source");
var o = require("./option");
var mlogger = require("./logger");
var mroom = require("./room");
var mterrain = require("./terrain");
var mms = require("./mapSearch");
function makeParaverse(game, map, memory) {
    var paraMemory = memory;
    if (paraMemory.logLevel === undefined)
        paraMemory.logLevel = 4;
    if (paraMemory.creepOrders === undefined)
        paraMemory.creepOrders = {};
    if (paraMemory.terrainMap === undefined)
        paraMemory.terrainMap = {};
    if (paraMemory.sourceMemories === undefined)
        paraMemory.sourceMemories = {};
    if (paraMemory.uid === undefined)
        paraMemory.uid = game.time;
    if (paraMemory.towerMemory === undefined)
        paraMemory.towerMemory = {};
    if (paraMemory.wallHitPoints === undefined)
        paraMemory.wallHitPoints = {};
    if (paraMemory.fatigueRecords === undefined)
        paraMemory.fatigueRecords = {};
    return new ParaverseImpl(game, map, paraMemory);
}
exports.makeParaverse = makeParaverse;
var ParaverseImpl = (function () {
    function ParaverseImpl(game, map, memory) {
        var _this = this;
        this.game = game;
        this.map = map;
        this.memory = memory;
        this.log = mlogger.createLogger(memory.logLevel, this);
        this.LOG_LEVEL_SILENT = 0;
        this.LOG_LEVEL_ERROR = 1;
        this.LOG_LEVEL_WARN = 2;
        this.LOG_LEVEL_INFO = 3;
        this.LOG_LEVEL_DEBUG = 4;
        this.CREEP_TYPE_BUILDER = "builder";
        this.CREEP_TYPE_DEFENDER = "defender";
        this.CREEP_TYPE_HARVESTER = "harvester";
        this.CREEP_TYPE_TRANSPORTER = "transporter";
        this.CREEP_TYPE_UPGRADER = "upgrader";
        this.CREEP_TYPE_FOREIGNER = "foreigner";
        this.CREEP_TYPE_CLAIMER = "claimer";
        this.TERRAIN_CODE_PLAIN = 0;
        this.TERRAIN_CODE_SWAMP = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_WALL = TERRAIN_MASK_WALL;
        this.TERRAIN_CODE_LAVA = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_STRUCTURE = 8;
        this.TERRAIN_CODE_SOURCE = 16;
        this.TERRAIN_CODE_CREEP = 32;
        this.TERRAIN_CODE_CONSTRUCTION_SITE = 64;
        this.DELIVERY_AMOUNT = 150;
        this.PUSH_REQUEST = 0;
        this.PULL_REQUEST = 1;
        this.deliveryIntent = {};
        this.collectionIntent = {};
        this.bodyPartPriority = {};
        this.bodyPartPriority[MOVE] = 3;
        this.bodyPartPriority[HEAL] = 4;
        this.bodyPartPriority[WORK] = 1;
        this.bodyPartPriority[TOUGH] = 0;
        this.bodyPartPriority[ATTACK] = 2;
        this.bodyPartPriority[RANGED_ATTACK] = 2;
        this.bodyPartPriority[CARRY] = 1;
        this.bodyPartPriority[CLAIM] = 1;
        this.constructionSitesByRoom = {};
        this.constructionSitesByRoomAndType = {};
        this.possibleConstructionSitesCache = {};
        this.possibleMoveSitesCache = {};
        this.possibleCollectionSitesCache = {};
        this.collectedDefense = {};
        this.roomWrappers = {};
        this.structureWrappers = [];
        this.creepWrappers = [];
        this.sourceWrappers = [];
        var pv = this;
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            room.find(FIND_STRUCTURES).forEach(function (s) {
                o.tryCatch(function () { _this.structureWrappers.push(mstructure.makeStructureWrapper(s, pv)); }, "Creating wrapper for " + s.structureType + " " + s.id);
            });
            room.find(FIND_CREEPS).forEach(function (c) {
                o.tryCatch(function () { _this.creepWrappers.push(pv.makeCreepWrapper(c)); }, "Creating wrapper for creep " + c.name);
            });
            room.find(FIND_SOURCES).forEach(function (s) {
                o.tryCatch(function () { _this.sourceWrappers.push(source.makeSourceWrapper(s, pv)); }, "Creating wrapper for source " + s.id);
            });
            this.roomWrappers[room.name] = mroom.makeRoomWrapper(room);
        }
        //delete memory of dead crees
        for (var creepName in this.memory.creeps) {
            if (this.game.creeps[creepName] === undefined) {
                delete this.memory.creeps[creepName];
            }
        }
        //delete memory of dead spawns
        for (var spawnName in this.memory.spawns) {
            if (this.game.spawns[spawnName] === undefined) {
                delete this.game.spawns[spawnName];
            }
        }
        //delete memory of dead towers
        for (var towerId in this.memory.towerMemory) {
            var tower = this.game.getObjectById(towerId);
            if (tower === undefined || tower == null)
                delete this.memory.towerMemory[towerId];
        }
        this.myCreepWrappers = this.creepWrappers.filter(function (cw) { return cw.element.my; });
        this.hostileStructuresByRoom =
            dictionary.arrayToDictionary(this.structureWrappers.filter(function (sw) { return !sw.my; }).map(function (sw) { return sw.element; }), function (s) { return s.room.name; });
        this.myCreepWrappersByRoom =
            dictionary.arrayToDictionary(this.myCreepWrappers, function (cw) { return cw.element.room.name; });
        this.myCreepWrappersByRoomAndType =
            dictionary.mapValues(this.myCreepWrappersByRoom, function (cwa) { return dictionary.arrayToDictionary(cwa, function (cw) { return cw.creepType; }); });
        this.hostileCreepsByRoom =
            dictionary.arrayToDictionary(this.creepWrappers.filter(function (cw) { return !cw.element.my; }).map(function (cw) { return cw.element; }), function (c) { return c.room.name; });
        this.myStructures = this.structureWrappers.filter(function (sw) { return sw.my; });
        this.myStructuresByRoom =
            dictionary.arrayToDictionary(this.myStructures, function (sw) { return sw.element.room.name; });
        this.myStructuresByRoomAndType =
            dictionary.mapValues(this.myStructuresByRoom, function (rsw) { return dictionary.arrayToDictionary(rsw, function (sw) { return sw.element.structureType; }); });
        var fatigueRecords = this.memory.fatigueRecords;
        for (var rn in fatigueRecords) {
            for (var frk in fatigueRecords[rn]) {
                fatigueRecords[rn][frk].fatigue -= 1.0;
                if (fatigueRecords[rn][frk].fatigue < 0)
                    delete fatigueRecords[rn][frk];
            }
        }
        this.structuresById = {};
        for (var swi = 0; swi < this.structureWrappers.length; ++swi) {
            var sw = this.structureWrappers[swi];
            this.structuresById[sw.element.id] = sw;
        }
        this.creepsById = {};
        for (var cwi = 0; cwi < this.creepWrappers.length; ++cwi) {
            var cw = this.creepWrappers[cwi];
            this.creepsById[cw.element.id] = cw;
        }
    }
    ParaverseImpl.prototype.getMyRooms = function () {
        return dictionary.getValues(this.roomWrappers).filter(function (rw) { return (rw.room.controller === undefined) ? false : rw.room.controller.my; });
    };
    ParaverseImpl.prototype.getMyCreeps = function () {
        if (this.myCreepWrappers === undefined || this.myCreepWrappers == null) {
            this.myCreepWrappers = this.creepWrappers.filter(function (cw) { return cw.element.my; });
        }
        return this.myCreepWrappers;
    };
    ParaverseImpl.prototype.getMyCreepsByRoom = function (room) {
        if (this.myCreepWrappersByRoom === undefined) {
            this.myCreepWrappersByRoom = {};
        }
        var mcwbr = this.myCreepWrappersByRoom;
        if (mcwbr[room.name] === undefined) {
            mcwbr[room.name] = this.getMyCreeps().filter(function (cw) { return cw.element.room.name == room.name; });
        }
        return mcwbr[room.name];
    };
    ParaverseImpl.prototype.getMyCreepsByRoomAndType = function (room, creepType) {
        if (this.myCreepWrappersByRoomAndType === undefined) {
            this.myCreepWrappersByRoomAndType = {};
        }
        var mcwbrat = this.myCreepWrappersByRoomAndType;
        if (mcwbrat[room.name] === undefined) {
            mcwbrat[room.name] = {};
        }
        var mcwbt = mcwbrat[room.name];
        if (mcwbt[creepType] === undefined) {
            mcwbt[creepType] = this.getMyCreepsByRoom(room).filter(function (cw) { return cw.creepType == creepType; });
        }
        return mcwbt[creepType];
    };
    ParaverseImpl.prototype.getCreepById = function (id) {
        if (this.creepsById[id] === undefined)
            return o.None();
        else
            return o.Some(this.creepsById[id]);
    };
    ParaverseImpl.prototype.getMyStructures = function () {
        return this.myStructures;
    };
    ParaverseImpl.prototype.getMyStructuresByRoom = function (room) {
        if (this.myStructuresByRoom[room.name] === undefined) {
            this.myStructuresByRoom[room.name] = [];
        }
        return this.myStructuresByRoom[room.name];
    };
    ParaverseImpl.prototype.getMyStructuresByRoomAndType = function (room, structureType) {
        if (this.myStructuresByRoomAndType[room.name] === undefined)
            this.myStructuresByRoomAndType[room.name] = {};
        var msbt = this.myStructuresByRoomAndType[room.name];
        if (msbt[structureType] === undefined)
            msbt[structureType] = [];
        return msbt[structureType];
    };
    ParaverseImpl.prototype.getStructureById = function (id) {
        if (this.structuresById[id] === undefined)
            return o.None();
        else
            return o.Some(this.structuresById[id]);
    };
    ParaverseImpl.prototype.getRequestorById = function (id) {
        var creep = this.getCreepById(id);
        if (creep.isPresent)
            return creep;
        else
            return this.getStructureById(id);
    };
    ParaverseImpl.prototype.manageResources = function (room) {
        mtransporter.manageResourcesForRoom(room, this);
    };
    ParaverseImpl.prototype.getRoomMemory = function (room) {
        if (this.memory.roomMemories === undefined)
            this.memory.roomMemories = {};
        var roomMemory = dictionary.getOrAdd(this.memory.roomMemories, room.name, {
            queuedResourceRequests: [],
            roomsToClaim: [],
            roomsToMine: [],
            roomsToSign: []
        });
        if (roomMemory.roomsToClaim === undefined)
            roomMemory.roomsToClaim = [];
        if (roomMemory.roomsToMine === undefined)
            roomMemory.roomsToMine = [];
        if (roomMemory.roomsToSign === undefined)
            roomMemory.roomsToSign = [];
        return roomMemory;
    };
    ParaverseImpl.prototype.getSpawnMemory = function (spawn) {
        var mem = spawn.memory;
        if (mem.lastTickEnergy === undefined)
            mem.lastTickEnergy = 0;
        if (mem.ticksSinceLastDonation === undefined)
            mem.ticksSinceLastDonation = 1;
        return mem;
    };
    ParaverseImpl.prototype.getMySources = function () {
        return this.sourceWrappers.filter(function (sw) { return sw.source.room.controller === undefined ? false : sw.source.room.controller.my; });
    };
    ParaverseImpl.prototype.getSourceMemory = function (s) {
        if (this.memory.sourceMemories[s.id] === undefined) {
            this.memory.sourceMemories[s.id] = source.makeSourceMemory(s, this);
        }
        return this.memory.sourceMemories[s.id];
    };
    ParaverseImpl.prototype.getHostileCreepsInRoom = function (room) {
        if (this.hostileCreepsByRoom === undefined || this.hostileCreepsByRoom == null)
            this.hostileCreepsByRoom = {};
        var hcbr = this.hostileCreepsByRoom;
        if (hcbr[room.name] === undefined) {
            hcbr[room.name] = [];
        }
        return hcbr[room.name];
    };
    ParaverseImpl.prototype.getHostileStructuresInRoom = function (room) {
        if (this.hostileStructuresByRoom === undefined || this.hostileStructuresByRoom == null)
            this.hostileStructuresByRoom = {};
        var hsbr = this.hostileStructuresByRoom;
        if (hsbr[room.name] === undefined) {
            hsbr[room.name] = [];
        }
        return hsbr[room.name];
    };
    ParaverseImpl.prototype.getCreepOrders = function (roomName) {
        if (this.memory.creepOrders[roomName] === undefined) {
            this.memory.creepOrders[roomName] = [];
        }
        return o.wrapPriorityQueueData(this.memory.creepOrders[roomName]);
    };
    ParaverseImpl.prototype.setLogLevel = function (logLevel) {
        this.memory.logLevel = logLevel;
        this.log.setLogLevel(logLevel);
    };
    ParaverseImpl.prototype.getConstructionSitesFromRoom = function (room) {
        if (this.constructionSitesByRoom[room.name] === undefined) {
            this.constructionSitesByRoom[room.name] = room.find(FIND_MY_CONSTRUCTION_SITES);
            this.constructionSitesByRoomAndType[room.name] =
                dictionary.arrayToDictionary(this.constructionSitesByRoom[room.name], function (cs) { return cs.structureType; });
        }
        return this.constructionSitesByRoom[room.name];
    };
    ParaverseImpl.prototype.getConstructionSitesFromRoomOfType = function (room, structureType) {
        this.getConstructionSitesFromRoom(room);
        var csbt = this.constructionSitesByRoomAndType[room.name];
        if (csbt[structureType] === undefined)
            csbt[structureType] = [];
        return csbt[structureType];
    };
    ParaverseImpl.prototype.scheduleCreep = function (room, order, priority) {
        // call getCreepOrders before looking at the raw entries
        var pq = this.getCreepOrders(room.name);
        var alreadySpawning = this.getMyStructuresByRoomAndType(room, STRUCTURE_SPAWN).filter(function (sw) {
            var spawning = sw.element.spawning;
            return spawning != null;
        }).length > 0;
        var alreadySpawningOrScheduled = alreadySpawning || this.memory.creepOrders[room.name].filter(function (pqe) { return pqe.elem.orderName == order.orderName; }).length > 0;
        if (alreadySpawningOrScheduled) {
            return;
        }
        else {
            pq.push(order, priority - this.game.time / 20.0);
            return;
        }
    };
    ParaverseImpl.prototype.removeCreepOrder = function (roomName, orderName) {
        var pq = this.getCreepOrders(roomName);
        var creepOrders = this.memory.creepOrders[roomName];
        var elems = creepOrders.filter(function (pqe) { return pqe.elem.orderName == orderName; });
        if (elems.length > 0) {
            var idx = elems[0].index;
            pq.prioritize(idx, creepOrders[0].priority + 1);
            pq.pop();
        }
    };
    ParaverseImpl.prototype.makeBuilderOrder = function (orderName) { return mbuilder.makeBuilderOrder(orderName, this); };
    ParaverseImpl.prototype.makeHarvesterOrder = function (orderName, sourceId) { return mharvester.makeHarvesterOrder(orderName, sourceId, this); };
    ParaverseImpl.prototype.makeTransporterOrder = function (orderName) { return mtransporter.makeTransporterOrder(orderName, this); };
    ParaverseImpl.prototype.makeUpgraderOrder = function (orderName, roomName) { return mupgrader.makeUpgraderOrder(orderName, roomName, this); };
    ParaverseImpl.prototype.makeDefenderOrder = function (orderName, targetId) { return mdefender.makeDefenderOrder(orderName, targetId, this); };
    ParaverseImpl.prototype.makeClaimerOrder = function (orderName, destination, destinationPath) { return mclaimer.makeClaimerOrder(orderName, destination, destinationPath, this); };
    ParaverseImpl.prototype.getTerrain = function (room) {
        var _this = this;
        if (this.memory.terrainMap[room.name] === undefined) {
            var terrain = room.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 49, true);
            var result_1 = [];
            for (var r = 0; r < 50; ++r) {
                result_1.push([]);
                for (var c = 0; c < 50; ++c) {
                    result_1[r].push(-1);
                }
            }
            terrain.forEach(function (larwp) {
                if (larwp.terrain !== undefined) {
                    result_1[larwp.x][larwp.y] = mterrain.terrainStringToCode(larwp.terrain, _this);
                }
            });
            for (var r = 0; r < 50; ++r) {
                for (var c = 0; c < 50; ++c) {
                    if (result_1[r][c] == -1)
                        throw new Error("result[" + r + "][" + c + "] not set correctly.");
                }
            }
            this.memory.terrainMap[room.name] = result_1;
        }
        return this.memory.terrainMap[room.name];
    };
    ParaverseImpl.prototype.getPossibleMoveSites = function (room) {
        var _this = this;
        if (this.possibleMoveSitesCache === undefined)
            this.possibleMoveSitesCache = {};
        if (this.possibleMoveSitesCache[room.name] === undefined) {
            var result_2 = this.getTerrain(room).map(function (row) { return row.map(function (col) { return col == _this.TERRAIN_CODE_PLAIN || col == _this.TERRAIN_CODE_SWAMP; }); });
            this.structureWrappers.forEach(function (sw) {
                if (sw.element.room.name == room.name && _this.isMovementBlocking(sw.element.structureType))
                    result_2[sw.element.pos.x][sw.element.pos.y] = false;
            });
            this.getMySources().forEach(function (sw) { result_2[sw.source.pos.x][sw.source.pos.y] = false; });
            this.getMyCreepsByRoom(room).forEach(function (cw) { result_2[cw.element.pos.x][cw.element.pos.y] = false; });
            this.getHostileCreepsInRoom(room).forEach(function (creep) { if (creep.room.name == room.name)
                result_2[creep.pos.x][creep.pos.y] = false; });
            this.possibleMoveSitesCache[room.name] = result_2;
        }
        return this.possibleMoveSitesCache[room.name];
    };
    ParaverseImpl.prototype.getPossibleCollectionSites = function (room) {
        var _this = this;
        if (this.possibleCollectionSitesCache === undefined)
            this.possibleCollectionSitesCache = {};
        if (this.possibleCollectionSitesCache[room.name] === undefined) {
            var result_3 = this.getTerrain(room).map(function (row) { return row.map(function (col) { return col == _this.TERRAIN_CODE_PLAIN || col == _this.TERRAIN_CODE_SWAMP; }); });
            this.structureWrappers.forEach(function (sw) {
                if (sw.element.room.name == room.name && _this.isMovementBlocking(sw.element.structureType))
                    result_3[sw.element.pos.x][sw.element.pos.y] = false;
            });
            this.getMySources().forEach(function (sw) { result_3[sw.source.pos.x][sw.source.pos.y] = false; });
            this.possibleCollectionSitesCache[room.name] = result_3;
        }
        return this.possibleCollectionSitesCache[room.name];
    };
    ParaverseImpl.prototype.isMovementBlocking = function (structureType) {
        switch (structureType) {
            case STRUCTURE_RAMPART:
            case STRUCTURE_CONTAINER:
                return false;
            default:
                return true;
        }
    };
    ParaverseImpl.prototype.getPossibleConstructionSites = function (room) {
        var _this = this;
        if (this.possibleConstructionSitesCache === undefined)
            this.possibleConstructionSitesCache = {};
        if (this.possibleConstructionSitesCache[room.name] === undefined) {
            var result_4 = this.getTerrain(room).map(function (row) { return row.map(function (col) { return col == _this.TERRAIN_CODE_PLAIN || col == _this.TERRAIN_CODE_SWAMP; }); });
            this.getConstructionSitesFromRoom(room).forEach(function (cs) { return result_4[cs.pos.x][cs.pos.y] = false; });
            this.structureWrappers.forEach(function (sw) {
                if (sw.element.room.name == room.name) {
                    result_4[sw.element.pos.x][sw.element.pos.y] = false;
                    if (sw.element.structureType == STRUCTURE_CONTROLLER) {
                        for (var x1 = Math.max(0, sw.element.pos.x - 3); x1 < Math.min(sw.element.pos.x + 4, result_4.length); ++x1) {
                            for (var y1 = Math.max(0, sw.element.pos.y - 3); y1 < Math.min(sw.element.pos.y + 4, result_4[x1].length); ++y1) {
                                result_4[x1][y1] = false;
                            }
                        }
                    }
                }
            });
            this.getMySources().forEach(function (sw) { return result_4[sw.source.pos.x][sw.source.pos.y] = false; });
            this.possibleConstructionSitesCache[room.name] = result_4;
        }
        return this.possibleConstructionSitesCache[room.name];
    };
    ParaverseImpl.prototype.constructNextSite = function (room, structureType) {
        var possibleConstructionSites = this.getPossibleConstructionSites(room);
        var optXy = mms.searchForConstructionSite(possibleConstructionSites);
        if (optXy.isPresent)
            return room.createConstructionSite(optXy.get.x, optXy.get.y, structureType) == OK;
        else
            return false;
    };
    ParaverseImpl.prototype.constructNextContainer = function (source) {
        var possibleConstructionSites = this.getPossibleConstructionSites(source.room);
        var optXy = mms.searchForContainerConstructionSite(possibleConstructionSites, source.pos.x, source.pos.y);
        if (optXy.isPresent) {
            this.log.debug("Creating container at " + source.room.name + "[" + optXy.get.x + "][" + optXy.get.y + "].");
            return source.room.createConstructionSite(optXy.get.x, optXy.get.y, STRUCTURE_CONTAINER) == OK;
        }
        else {
            this.log.debug("Failed to create container for source " + source.id + " in room " + source.room.name);
            return false;
        }
    };
    ParaverseImpl.prototype.isCloseToLair = function (source, sourceMemory) {
        if (sourceMemory.isCloseToLair === undefined)
            sourceMemory.isCloseToLair = source.pos.findInRange(FIND_STRUCTURES, 10).filter(function (s) { return s.structureType == STRUCTURE_KEEPER_LAIR; }).length > 0;
        return sourceMemory.isCloseToLair;
    };
    ParaverseImpl.prototype.getTowerMemory = function (towerId) {
        if (this.memory.towerMemory[towerId] === undefined) {
            this.memory.towerMemory[towerId] = {
                status: "free",
                target: ""
            };
        }
        return this.memory.towerMemory[towerId];
    };
    ParaverseImpl.prototype.setTowerMemory = function (towerId, towerMemory) {
        this.memory.towerMemory[towerId] = towerMemory;
    };
    ParaverseImpl.prototype.getWallHitPoints = function (room) {
        if (this.memory.wallHitPoints[room.name] === undefined) {
            this.memory.wallHitPoints[room.name] = 1000;
        }
        return this.memory.wallHitPoints[room.name];
    };
    ParaverseImpl.prototype.setWallHitPoints = function (room, hitPoints) {
        this.memory.wallHitPoints[room.name] = hitPoints;
    };
    ParaverseImpl.prototype.getUid = function () {
        if (this.memory.uid === undefined) {
            this.memory.uid = this.game.time;
        }
        return ++(this.memory.uid);
    };
    ParaverseImpl.prototype.moveCreep = function (cw, pos) {
        if (cw.element.fatigue > 0 && this.getPossibleConstructionSites(cw.element.room)[cw.element.pos.x][cw.element.pos.y])
            this.recordFatigue(cw.element.pos.x, cw.element.pos.y, cw.element.pos.roomName);
        var isStuck = false;
        if (cw.element.fatigue == 0) {
            if (cw.element.pos.x == cw.memory.lastX && cw.element.pos.y == cw.memory.lastY) {
                ++cw.memory.lastTimeOfMoveAttempt;
            }
            else {
                cw.memory.lastX = cw.element.pos.x;
                cw.memory.lastY = cw.element.pos.y;
                cw.memory.lastTimeOfMoveAttempt = 0;
            }
            if (cw.memory.lastTimeOfMoveAttempt >= 5)
                isStuck = true;
        }
        return cw.element.moveTo(pos, { reusePath: isStuck ? 0 : 50, ignoreCreeps: !isStuck }) == OK;
    };
    ParaverseImpl.prototype.makeCreepWrapper = function (c) {
        if (!c.my)
            return new mMiscCreep.MiscCreepWrapper(c, this.CREEP_TYPE_FOREIGNER);
        switch (c.memory.creepType) {
            case this.CREEP_TYPE_BUILDER:
                return new mbuilder.BuilderCreepWrapper(c, this);
            case this.CREEP_TYPE_HARVESTER:
                return new mharvester.HarvesterCreepWrapper(c, this);
            case this.CREEP_TYPE_TRANSPORTER:
                return new mtransporter.TransporterCreepWrapper(c, this);
            case this.CREEP_TYPE_UPGRADER:
                return new mupgrader.UpgraderCreepWrapper(c, this);
            case this.CREEP_TYPE_DEFENDER:
                return new mdefender.DefenderCreepWrapper(c, this);
            case this.CREEP_TYPE_CLAIMER:
                return new mclaimer.ClaimerCreepWrapper(c, this);
            default:
                this.log.error("makeCreepWrapper: creep " + c.name + " of type " + c.memory.creepType + " not yet supported.");
                return new mMiscCreep.MiscCreepWrapper(c, c.memory.creepType);
        }
    };
    ParaverseImpl.prototype.isHarvesterWithSource = function (creepWrapper, sourceId) {
        return mharvester.isHarvesterWithSource(creepWrapper, sourceId, this);
    };
    ParaverseImpl.prototype.getTransporterEfficiency = function (room) {
        var _this = this;
        var ts = this.getMyCreepsByRoomAndType(room, this.CREEP_TYPE_TRANSPORTER);
        var efficiencies = ts.map(function (cw) { return _this.getEfficiency(cw.element.memory); });
        if (efficiencies.length == 0)
            return 1;
        else
            return o.sum(efficiencies) / efficiencies.length;
    };
    ParaverseImpl.prototype.pushEfficiency = function (memory, efficiency) {
        var maxSize = 200;
        var eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
        eq.push(efficiency);
        memory.totalEfficiency += efficiency;
        while (eq.length() > maxSize && maxSize >= 0) {
            memory.totalEfficiency -= eq.pop().get;
        }
    };
    ParaverseImpl.prototype.getEfficiency = function (memory) {
        var eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
        if (eq.isEmpty())
            return 0;
        else
            return memory.totalEfficiency / eq.length();
    };
    ParaverseImpl.prototype.avoidObstacle = function (cw) {
        var creep = cw.element;
        var possibleMoveSites = this.getPossibleMoveSites(creep.room);
        var validMoves = [];
        var checkForObstacle = function (dx, dy, pv) {
            var x = creep.pos.x + dx;
            var y = creep.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49)
                return true;
            if (!possibleMoveSites[x][y]) {
                return true;
            }
            validMoves.push({ x: x, y: y });
            return false;
        };
        var downObs = checkForObstacle(0, 1, this);
        var leftObs = checkForObstacle(-1, 0, this);
        var rightObs = checkForObstacle(1, 0, this);
        var upObs = checkForObstacle(0, -1, this);
        checkForObstacle(-1, -1, this);
        checkForObstacle(-1, 1, this);
        checkForObstacle(1, -1, this);
        checkForObstacle(1, 1, this);
        var nextToObstacle = upObs || downObs || leftObs || rightObs;
        if (nextToObstacle && validMoves.length > 0) {
            var randomValidMove = validMoves[(Math.floor(Math.random() * validMoves.length) + this.game.time) % validMoves.length];
            var newPos = creep.room.getPositionAt(randomValidMove.x, randomValidMove.y);
            this.moveCreep(cw, newPos);
        }
    };
    ParaverseImpl.prototype.recordDefense = function (soldier, enemyId) {
        if (this.collectedDefense === undefined)
            this.collectedDefense = {};
        var collectedDefense = this.collectedDefense;
        if (collectedDefense[enemyId] === undefined)
            collectedDefense[enemyId] = 0;
        collectedDefense[enemyId] += this.getSoldierCapability(soldier);
    };
    ParaverseImpl.prototype.getTotalCollectedDefense = function (enemyId) {
        if (this.collectedDefense === undefined)
            this.collectedDefense = {};
        var collectedDefense = this.collectedDefense;
        if (collectedDefense[enemyId] === undefined)
            collectedDefense[enemyId] = 0;
        return collectedDefense[enemyId];
    };
    ParaverseImpl.prototype.getSoldierCapability = function (soldier) {
        return (soldier.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER
            + soldier.getActiveBodyparts(HEAL) * HEAL_POWER);
    };
    ParaverseImpl.prototype.resourceAmount = function (storage, resourceType) {
        if (storage[resourceType] === undefined)
            return 0;
        else
            return storage[resourceType];
    };
    ParaverseImpl.prototype.availableSpace = function (storage, capacity) {
        var fullness = 0;
        for (var rt in storage)
            fullness += storage[rt];
        return capacity - fullness;
    };
    ParaverseImpl.prototype.recordFatigue = function (x, y, roomName) {
        var key = x + "_" + y;
        var roomFr = dictionary.getOrAdd(this.memory.fatigueRecords, roomName, {});
        dictionary.getOrAdd(roomFr, key, { xy: { x: x, y: y }, fatigue: 0 });
        roomFr[key].fatigue += 20;
    };
    ParaverseImpl.prototype.mustBuildRoad = function (room) {
        var roomfr = dictionary.getOrElse(this.memory.fatigueRecords, room.name, {});
        //delete fatigue records on places which already have construction
        var cs = this.getPossibleConstructionSites(room);
        for (var frk in roomfr) {
            var frxy = roomfr[frk].xy;
            if (!cs[frxy.x][frxy.y])
                delete roomfr[frk];
        }
        for (var frk in roomfr) {
            if (roomfr[frk].fatigue > 1000)
                return true;
        }
        return false;
    };
    ParaverseImpl.prototype.getRoadToBeBuilt = function (room) {
        var roomFrs = this.memory.fatigueRecords[room.name];
        var maxFFr = o.maxBy(dictionary.getValues(roomFrs), function (fr) { return fr.fatigue; });
        return maxFFr.get.elem.xy;
    };
    ParaverseImpl.prototype.euclidean = function (p1, p2) {
        return mterrain.euclidean(p1, p2, this);
    };
    ParaverseImpl.prototype.manhattan = function (p1, p2) {
        return mterrain.manhattan(p1, p2, this);
    };
    return ParaverseImpl;
}());
