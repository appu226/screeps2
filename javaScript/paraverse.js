"use strict";
var dictionary = require("./dictionary");
var mstructure = require("./structure");
var mMiscCreep = require("./miscCreep");
var mtransporter = require("./transporter");
var mbuilder = require("./builder");
var mharvester = require("./harvester");
var mupgrader = require("./upgrader");
var source = require("./source");
var o = require("./option");
var mlogger = require("./logger");
var mroom = require("./room");
var mterrain = require("./terrain");
var mrr = require("./resourceRequest");
function makeParaverse(game, map, memory) {
    var paraMemory = memory;
    if (paraMemory.logLevel === undefined)
        paraMemory.logLevel = 4;
    if (paraMemory.creepOrders === undefined)
        paraMemory.creepOrders = {};
    if (paraMemory.terrainMap === undefined)
        paraMemory.terrainMap = {};
    if (paraMemory.terrainStructureMap === undefined)
        paraMemory.terrainStructureMap = {};
    if (paraMemory.plannedConstructionSites === undefined)
        paraMemory.plannedConstructionSites = {};
    if (paraMemory.sourceMemories === undefined)
        paraMemory.sourceMemories = {};
    if (paraMemory.uid === undefined)
        paraMemory.uid = game.time;
    if (paraMemory.resourceSendRequests === undefined)
        paraMemory.resourceSendRequests = { pushStack: [], popStack: [] };
    if (paraMemory.resourceReceiveRequests === undefined)
        paraMemory.resourceReceiveRequests = { pushStack: [], popStack: [] };
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
        this.CREEP_TYPE_HARVESTER = "harvester";
        this.CREEP_TYPE_TRANSPORTER = "transporter";
        this.CREEP_TYPE_UPGRADER = "upgrader";
        this.CREEP_TYPE_FOREIGNER = "foreigner";
        this.TERRAIN_CODE_PLAIN = 0;
        this.TERRAIN_CODE_SWAMP = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_WALL = TERRAIN_MASK_WALL;
        this.TERRAIN_CODE_LAVA = TERRAIN_MASK_SWAMP;
        this.STRUCTURE_CODE_SOURCE = 1000;
        this.STRUCTURE_CODE_TOWER = 1001;
        this.STRUCTURE_CODE_CWALL = 1002;
        this.STRUCTURE_CODE_SPAWN = 1003;
        this.STRUCTURE_CODE_EXTENSION = 1004;
        this.STRUCTURE_CODE_ROAD = 1005;
        this.STRUCTURE_CODE_RAMPART = 1006;
        this.STRUCTURE_CODE_KEEPER_LAIR = 1007;
        this.STRUCTURE_CODE_CONTROLLER = 1008;
        this.DELIVERY_AMOUNT = 50;
        this.deliveryIntent = {};
        this.collectionIntent = {};
        this.bodyPartPriority = {};
        this.bodyPartPriority[MOVE] = 1;
        this.bodyPartPriority[HEAL] = 0;
        this.bodyPartPriority[WORK] = 3;
        this.bodyPartPriority[TOUGH] = 4;
        this.bodyPartPriority[ATTACK] = 2;
        this.bodyPartPriority[RANGED_ATTACK] = 2;
        this.bodyPartPriority[CARRY] = 3;
        this.bodyPartPriority[CLAIM] = 3;
        this.constructionSiteCache = {};
        this.roomWrappers = {};
        this.structureWrappers = {};
        this.creepWrappers = {};
        this.sourceWrappers = {};
        var pv = this;
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            room.find(FIND_STRUCTURES).forEach(function (s) {
                o.tryCatch(function () { _this.structureWrappers[s.id] = mstructure.makeStructureWrapper(s, pv); }, "Creating wrapper for " + s.structureType + " " + s.id);
            });
            room.find(FIND_CREEPS).forEach(function (c) {
                o.tryCatch(function () { _this.creepWrappers[c.id] = pv.makeCreepWrapper(c); }, "Creating wrapper for creep " + c.name);
            });
            room.find(FIND_SOURCES).forEach(function (s) {
                o.tryCatch(function () { _this.sourceWrappers[s.id] = source.makeSourceWrapper(s, pv); }, "Creating wrapper for source " + s.id);
            });
            this.roomWrappers[room.name] = mroom.makeRoomWrapper(room);
        }
    }
    ParaverseImpl.prototype.getMyRooms = function () {
        return dictionary.getValues(this.roomWrappers).filter(function (rw) { return rw.room.controller.my; });
    };
    ParaverseImpl.prototype.getMyStructures = function () {
        return dictionary.getValues(this.structureWrappers).filter(function (sw) { return sw.my; });
    };
    ParaverseImpl.prototype.getMyCreeps = function () {
        return dictionary.getValues(this.creepWrappers).filter(function (cw) { return cw.creep.my; });
    };
    ParaverseImpl.prototype.getMySources = function () {
        return dictionary.getValues(this.sourceWrappers).filter(function (sw) { return sw.source.room.controller.my; });
    };
    ParaverseImpl.prototype.getSourceMemory = function (s) {
        if (this.memory.sourceMemories[s.id] === undefined) {
            this.memory.sourceMemories[s.id] = source.makeSourceMemory(s, this);
        }
        return this.memory.sourceMemories[s.id];
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
        if (this.constructionSiteCache[room.name] === undefined) {
            this.constructionSiteCache[room.name] = room.find(FIND_CONSTRUCTION_SITES);
        }
        return this.constructionSiteCache[room.name];
    };
    ParaverseImpl.prototype.scheduleCreep = function (roomName, order, priority) {
        // call getCreepOrders before looking at the raw entries
        var pq = this.getCreepOrders(roomName);
        if (this.memory.creepOrders[roomName].filter(function (pqe) { return pqe.elem.orderName == order.orderName; }).length > 0) {
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
    ParaverseImpl.prototype.requestResourceReceive = function (roomName, requestorId, isRequestorCreep, resourceType, amount) {
        mrr.pushResourceRequest(this.memory.resourceReceiveRequests, roomName, requestorId, isRequestorCreep, resourceType, amount, this.getDeliveryIntent(requestorId, resourceType), this);
    };
    ParaverseImpl.prototype.requestResourceSend = function (roomName, requestorId, isRequestorCreep, resourceType, amount) {
        mrr.pushResourceRequest(this.memory.resourceSendRequests, roomName, requestorId, isRequestorCreep, resourceType, amount, this.getCollectionIntent(requestorId, resourceType), this);
    };
    ParaverseImpl.prototype.getReceiveRequests = function () {
        var queueData = this.memory.resourceReceiveRequests;
        return o.makeQueue(queueData.pushStack, queueData.popStack);
    };
    ParaverseImpl.prototype.getSendRequests = function () {
        var queueData = this.memory.resourceSendRequests;
        return o.makeQueue(queueData.pushStack, queueData.popStack);
    };
    ParaverseImpl.prototype.manageSupplyAndDemand = function () {
        var _this = this;
        var receiveRequests = this.getReceiveRequests();
        var sendRequests = this.getSendRequests();
        var _loop_1 = function (isr) {
            var sr = sendRequests.pop().get;
            var isRequestAssigned = false; // parameter to track whether request has been assigned to a transporter
            var destination = this_1.game.getObjectById(sr.requestorId);
            if (destination != null) {
                var freeTransporters = this_1.getMyCreeps().filter(function (cw) { return mtransporter.isFreeTransporter(cw, _this); });
                var closestTransporter = o.maxBy(freeTransporters, function (cw) { return mterrain.euclidean(cw.creep.pos, destination.pos, _this) * -1; });
                if (closestTransporter.isPresent) {
                    var rro = receiveRequests.extract(function (rr) { return rr.resourceType == sr.resourceType; });
                    if (rro.isPresent) {
                        mtransporter.assignTransporter(closestTransporter.get.elem, sr, rro.get, this_1);
                        isRequestAssigned = true;
                    }
                }
                //if request could not be assigned, push it back into the queue
                if (!isRequestAssigned)
                    sendRequests.push(sr);
            }
        };
        var this_1 = this;
        //go through the entire sendRequest queue, popping every request
        //requests that cannot be satisfied get pushed back into the queue
        //FIFO behavior guarantees that order of unsatisfied requests is preserved
        for (var isr = sendRequests.length(); isr > 0; --isr) {
            _loop_1(isr);
        }
    };
    ParaverseImpl.prototype.recordDeliveryIntent = function (destinationId, resourceName) {
        if (this.deliveryIntent === undefined)
            this.deliveryIntent = {};
        var di = this.deliveryIntent;
        if (di[destinationId] === undefined)
            di[destinationId] = {};
        var ddi = di[destinationId];
        if (ddi[resourceName] === undefined)
            ddi[resourceName] = 0;
        ddi[resourceName] += 1;
    };
    ParaverseImpl.prototype.recordCollectionIntent = function (sourceId, resourceName) {
        if (this.collectionIntent === undefined)
            this.collectionIntent = {};
        var ci = this.collectionIntent;
        if (ci[sourceId] === undefined)
            ci[sourceId] = {};
        var sci = ci[sourceId];
        if (sci[resourceName] === undefined)
            sci[resourceName] = 0;
        sci[resourceName] += 1;
    };
    ParaverseImpl.prototype.getDeliveryIntent = function (destinationId, resourceName) {
        if (this.deliveryIntent === undefined)
            this.deliveryIntent = {};
        var di = this.deliveryIntent;
        if (di[destinationId] === undefined)
            di[destinationId] = {};
        var ddi = di[destinationId];
        if (ddi[resourceName] === undefined)
            ddi[resourceName] = 0;
        return ddi[resourceName];
    };
    ParaverseImpl.prototype.getCollectionIntent = function (sourceId, resourceName) {
        if (this.collectionIntent === undefined)
            this.collectionIntent = {};
        var ci = this.collectionIntent;
        if (ci[sourceId] === undefined)
            ci[sourceId] = {};
        var sci = ci[sourceId];
        if (sci[resourceName] === undefined)
            sci[resourceName] = 0;
        return sci[resourceName];
    };
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
    ParaverseImpl.prototype.getTerrainWithStructures = function (room) {
        var _this = this;
        var result = this.getTerrain(room).map(function (row) { return row.map(function (col) { return col; }); });
        dictionary.forEach(this.structureWrappers, function (k, v) {
            if (v.structure.room.name == room.name)
                result[v.structure.pos.x][v.structure.pos.y] =
                    mstructure.structureTypeToCode(v.structure.structureType, _this);
        });
        return result;
    };
    ParaverseImpl.prototype.getStructureCode = function (structureType) {
        return mstructure.structureTypeToCode(structureType, this);
    };
    ParaverseImpl.prototype.getPlannedConstructionSites = function (roomName) {
        if (this.memory.plannedConstructionSites[roomName] === undefined) {
            this.memory.plannedConstructionSites[roomName] = [];
        }
        return this.memory.plannedConstructionSites[roomName];
    };
    ParaverseImpl.prototype.constructNextSite = function (room) {
        var _this = this;
        if (this.getConstructionSitesFromRoom(room).length > 0)
            return;
        var plan = this.getPlannedConstructionSites(room.name);
        var tws = this.getTerrainWithStructures(room);
        var eligiblePlans = plan.filter(function (pcs) { return pcs.roomName == room.name && isEligibleCodeForBuilding(tws[pcs.x][pcs.y], _this); });
        if (eligiblePlans.length == 0)
            return;
        var bestPcsO = o.maxBy(eligiblePlans, function (pcs) { return getPlannedConstructionSitePriority(pcs.structureType, _this); });
        if (bestPcsO.isPresent) {
            var bestPcs = bestPcsO.get.elem;
            room.createConstructionSite(bestPcs.x, bestPcs.y, bestPcs.structureType);
        }
    };
    ParaverseImpl.prototype.getUid = function () {
        if (this.memory.uid === undefined) {
            this.memory.uid = this.game.time;
        }
        return ++(this.memory.uid);
    };
    ParaverseImpl.prototype.moveCreep = function (cw, pos) {
        return cw.creep.moveTo(pos) == OK;
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
        var ts = this.getMyCreeps().filter(function (cw) { return cw.creepType == _this.CREEP_TYPE_TRANSPORTER && cw.creep.room.name == room.name; });
        var efficiencies = ts.map(function (cw) { return _this.getEfficiency(cw.creep.memory); });
        if (efficiencies.length == 0)
            return 1;
        else
            return o.sum(efficiencies) / efficiencies.length;
    };
    ParaverseImpl.prototype.pushEfficiency = function (memory, efficiency) {
        var maxSize = 50;
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
    return ParaverseImpl;
}());
function isEligibleCodeForBuilding(code, pv) {
    return code == pv.TERRAIN_CODE_PLAIN || code == pv.TERRAIN_CODE_SWAMP;
}
function getPlannedConstructionSitePriority(structureType, pv) {
    switch (structureType) {
        case STRUCTURE_TOWER: return 100;
        case STRUCTURE_WALL: return 99;
        case STRUCTURE_ROAD: return 98;
        default: return 0;
    }
}
