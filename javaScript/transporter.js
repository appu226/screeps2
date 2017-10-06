"use strict";
var mopt = require("./option");
var mdict = require("./dictionary");
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
        collection: [],
        delivery: [],
        currentAmount: 0,
        currentRequest: mopt.None(),
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    };
}
var TransporterCreepWrapper = (function () {
    function TransporterCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = creep.memory;
        this.resourceRequests = [];
    }
    TransporterCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    TransporterCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    TransporterCreepWrapper.prototype.preprocess = function (pv) {
        var _this = this;
        var m = this.memory;
        // reset currentRequest if object dies or amount changes
        if (m.currentRequest.isPresent) {
            var cr = m.currentRequest.get;
            if (this.resourceAmount(cr.resourceType) != m.currentAmount
                || !pv.getRequestorById(cr.requestorId).isPresent) {
                m.currentRequest = mopt.None();
            }
        }
        // try to find next request
        if (!m.currentRequest.isPresent) {
            if (m.collection.length == 0 && m.delivery.length == 0)
                return;
            //delete dead requests
            m.collection = m.collection.filter(function (rr) { return pv.getRequestorById(rr.requestorId).isPresent; });
            m.delivery = m.delivery.filter(function (rr) { return pv.getRequestorById(rr.requestorId).isPresent; });
            if (m.collection.length == 0 && m.delivery.length == 0)
                return;
            // find satisfyable resource requests
            var eligible_1 = [];
            var es_1 = this.emptyStorage();
            m.collection.forEach(function (rr) { if (rr.amount <= es_1)
                eligible_1.push(rr); });
            if (eligible_1.length == 0)
                m.collection.forEach(function (rr) { return eligible_1.push(rr); });
            if (m.delivery.length > 0) {
                var ra_1 = this.resourceAmount(m.delivery[0].resourceType);
                m.delivery.forEach(function (rr) { if (rr.amount <= ra_1)
                    eligible_1.push(rr); });
            }
            if (eligible_1.length == 0)
                m.delivery.forEach(function (rr) { return eligible_1.push(rr); });
            //find closest satisfyable request
            var closest_1 = mopt.maxBy(eligible_1, function (rr) { return pv.manhattan(_this.element.pos, pv.getRequestorById(rr.requestorId).get.element.pos) * -1; });
            if (!closest_1.isPresent) {
                m.collection = [];
                m.delivery = [];
                return;
            }
            //remove closest satisfyable from pending request lists
            m.collection = m.collection.filter(function (rr) { return rr != closest_1.get.elem; });
            m.delivery = m.delivery.filter(function (rr) { return rr != closest_1.get.elem; });
            m.currentRequest = mopt.Some(closest_1.get.elem);
            // pv.log.debug(`transporter/preprocess: assigned ${this.element.name} to ${m.currentRequest.get.requestorId}.`);
            m.currentAmount = this.resourceAmount(m.currentRequest.get.resourceType);
        }
    };
    TransporterCreepWrapper.prototype.process = function (pv) {
        if (!this.memory.currentRequest.isPresent) {
            pv.avoidObstacle(this);
            pv.pushEfficiency(this.memory, this.element.ticksToLive < 50 ? 1 : 0);
            return;
        }
        var cr = this.memory.currentRequest.get;
        var orqor = pv.getRequestorById(cr.requestorId);
        if (!orqor.isPresent) {
            this.memory.currentRequest = mopt.None();
            pv.pushEfficiency(this.memory, this.element.ticksToLive < 50 ? 1 : 0);
            return;
        }
        var rqor = orqor.get;
        var res = OK;
        switch (cr.resourceRequestType) {
            case pv.PUSH_REQUEST: {
                res = rqor.giveResourceToCreep(this.element, cr.resourceType, Math.min(cr.amount, this.emptyStorage()));
                break;
            }
            case pv.PULL_REQUEST: {
                res = rqor.takeResourceFromCreep(this.element, cr.resourceType, Math.min(cr.amount, this.resourceAmount(cr.resourceType)));
                break;
            }
            default:
                throw new Error("Creep " + this.element.name + " hit an unexpected request type " + cr.resourceRequestType);
        }
        if (res == ERR_NOT_IN_RANGE) {
            pv.moveCreep(this, rqor.element.pos);
        }
        else
            this.memory.currentRequest = mopt.None();
        pv.pushEfficiency(this.memory, 1);
    };
    TransporterCreepWrapper.prototype.resourceAmount = function (resourceType) {
        if (this.element.carry[resourceType] === undefined)
            return 0;
        else
            return this.element.carry[resourceType];
    };
    TransporterCreepWrapper.prototype.emptyStorage = function () {
        return this.element.carryCapacity - mdict.sum(this.element.carry);
    };
    return TransporterCreepWrapper;
}());
exports.TransporterCreepWrapper = TransporterCreepWrapper;
var RRMap = (function () {
    function RRMap(rrArray, pv) {
        this.pullmap = RRMap.makeMap(rrArray.filter(function (rr) { return rr.resourceRequestType == pv.PULL_REQUEST; }));
        this.pushmap = RRMap.makeMap(rrArray.filter(function (rr) { return rr.resourceRequestType == pv.PUSH_REQUEST; }));
    }
    RRMap.makeMap = function (rrArray) {
        var rrtypeToArray = mdict.arrayToDictionary(rrArray, function (rr) { return rr.resourceType; });
        return mdict.mapValues(rrtypeToArray, function (rrarray) {
            var ridToArray = mdict.arrayToDictionary(rrarray, function (rr) { return rr.requestorId; });
            return mdict.mapValues(ridToArray, function (rrArray) {
                if (rrArray.length == 0)
                    throw new Error("Impossibility: found empty ResourceRequestMap in ResourceRequestArray");
                else if (rrArray.length == 1)
                    return rrArray[0];
                else
                    throw new Error("Impossibility: found more than one ResourceRequest for a map entry.");
            });
        });
    };
    RRMap.prototype.subtract = function (rr, pv) {
        var map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        if (map[rr.resourceType] === undefined || map[rr.resourceType][rr.requestorId] === undefined)
            return;
        map[rr.resourceType][rr.requestorId].amount -= rr.amount;
        if (map[rr.resourceType][rr.requestorId].amount <= 0)
            delete map[rr.resourceType][rr.requestorId];
    };
    RRMap.prototype.add = function (rr, pv) {
        var map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        if (map[rr.resourceType] === undefined || map[rr.resourceType][rr.requestorId] === undefined)
            return false;
        else {
            map[rr.resourceType][rr.requestorId].amount += rr.amount;
            map[rr.resourceType][rr.requestorId].isBlocker = rr.isBlocker;
            return true;
        }
    };
    RRMap.prototype.insert = function (rr, pv) {
        var map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        var map2 = mdict.getOrAdd(map, rr.resourceType, {});
        if (map2[rr.requestorId] === undefined)
            map2[rr.requestorId] = rr;
        else {
            map2[rr.requestorId].amount += rr.amount;
            map2[rr.requestorId].isBlocker = rr.isBlocker;
        }
    };
    return RRMap;
}());
function manageResourcesForRoom(room, pv) {
    // collect queued requests
    var queuedrr = pv.getRoomMemory(room).queuedResourceRequests;
    queuedrr.forEach(function (rr) { return pv.log(["transporter", "manageResourcesForRoom", "debug"], function () { return "from memory " + rrToString(rr, pv); }); });
    // collect all current requests
    var currentrr = mopt.flatten(pv.getMyCreepsByRoom(room).map(function (cw) { return cw.resourceRequests; })).concat(mopt.flatten(pv.getMyStructuresByRoom(room).map(function (sw) { return sw.resourceRequests; })));
    // collect transporters
    var transporters = pv.getMyCreepsByRoomAndType(room, pv.CREEP_TYPE_TRANSPORTER).map(function (cw) { return cw; });
    transporters.forEach(function (tcw) { return tcw.preprocess(pv); });
    // remove requests in progress from currentrr
    var currentmap = new RRMap(currentrr, pv);
    transporters.forEach(function (tcw) {
        tcw.memory.collection.forEach(function (rr) { currentmap.subtract(rr, pv); });
        tcw.memory.delivery.forEach(function (rr) { return currentmap.subtract(rr, pv); });
        if (tcw.memory.currentRequest.isPresent)
            currentmap.subtract(tcw.memory.currentRequest.get, pv);
    });
    // collect stored resources, and account for to-be-collected resources
    var storedrr = getStoredResources(room, pv);
    if (room.storage) {
        transporters.forEach(function (tcw) {
            tcw.memory.collection.forEach(function (rr) {
                if (rr.requestorId == room.storage.id)
                    storedrr[rr.resourceType] -= Math.min(rr.amount, storedrr[rr.resourceType]);
            });
        });
    }
    // replace queued amount with current amount
    queuedrr.forEach(function (qrr) { qrr.amount = 0; qrr.isBlocker = false; });
    var queuedmap = new RRMap(queuedrr, pv);
    var unqueued = [];
    currentrr.forEach(function (rr) {
        if (rr.amount > 0 && !queuedmap.add(rr, pv)) {
            unqueued.push(rr);
            queuedmap.insert(rr, pv);
        }
    });
    unqueued.forEach(function (rr) { queuedrr.push(rr); });
    // remove empty requests
    var queueDll = mopt.makeDLList(queuedrr);
    queueDll.forEach(function (entry) { return pv.log(["transporter", "manageResourcesForRoom", "debug"], function () { return "after makeDLList " + rrToString(entry.elem, pv); }); });
    var queuedResourceTypes = [];
    var qrrSet = {};
    queueDll.forEach(function (rre) {
        if (rre.elem.amount <= 0)
            queueDll.remove(rre);
        else if (qrrSet[rre.elem.resourceType] === undefined) {
            queuedResourceTypes.push(rre.elem.resourceType);
            qrrSet[rre.elem.resourceType] = true;
        }
    });
    if (queueDll.length == 0)
        return;
    // try to assign resourceTypes to free transporters
    queueDll.forEach(function (entry) { return pv.log(["transporter", "manageResourcesForRoom", "debug"], function () { return "preAssignment " + rrToString(entry.elem, pv); }); });
    transporters.sort(function (a, b) {
        var an = a.element.name;
        var bn = b.element.name;
        if (an == bn)
            return 0;
        else if (an < bn)
            return 1;
        else
            return -1;
    });
    transporters.forEach(function (tcw) {
        var mem = tcw.memory;
        queuedResourceTypes.forEach(function (rt) { assignRequest(tcw, queueDll, rt, storedrr, pv); });
    });
    // put queueDll back into queuerr
    pv.getRoomMemory(room).queuedResourceRequests = queueDll.toArray();
    pv.getRoomMemory(room).queuedResourceRequests.forEach(function (rr) { return pv.log(["transporter", "manageResourcesForRoom", "debug"], function () { return "postAssignment " + rrToString(rr, pv); }); });
    if (pv.getMyCreepsByRoom(room).length * 3 / 4 >= transporters.length // not more than 3/4ths should be transporters
        && pv.getTransporterEfficiency(room) > .9 // transporters should not be idle
        && avoidableBlocker(pv.getRoomMemory(room).queuedResourceRequests, pv) // transporters should make a difference
    ) {
        pv.scheduleCreep(room, pv.makeTransporterOrder("Transporter_" + room.name), 4);
    }
}
exports.manageResourcesForRoom = manageResourcesForRoom;
function getStoredResources(room, pv) {
    if (room.storage === undefined || room.storage == null)
        return {};
    var store = room.storage.store;
    var result = {};
    for (var resource in store)
        result[resource] = store[resource];
    return result;
}
// check whether there is a pending request that is a blocker
// that could have been avoided if we had more transporters
function avoidableBlocker(queuedRequests, pv) {
    var blockers = queuedRequests.filter(function (rr) { return rr.isBlocker; });
    if (blockers.length == 0)
        return false;
    return blockers.some(function (rr) {
        return rr.isBlocker
            && blockers.some(function (rr2) {
                return rr.resourceRequestType != rr2.resourceRequestType
                    && rr.resourceType == rr2.resourceType
                    && rr2.amount > 0;
            });
    });
}
var RRVec = (function () {
    function RRVec(_vec) {
        var _this = this;
        this.vec = _vec;
        this.map = {};
        _vec.forEach(function (rr) { _this.map[rr.requestorId] = rr; });
    }
    RRVec.prototype.push = function (rr) {
        if (this.map[rr.requestorId] !== undefined) {
            this.map[rr.requestorId].amount += rr.amount;
        }
        else {
            this.map[rr.requestorId] = rr;
            this.vec.push(rr);
        }
    };
    return RRVec;
}());
function assignRequest(tcw, queueDll, resourceType, storedrr, pv) {
    var mem = tcw.memory;
    // if transporter is already assigned, return
    if (mem.currentRequest.isPresent || mem.delivery.length > 0 || mem.collection.length > 0)
        return;
    // do not mess with requestor the transporter is just about to deal with
    var requestorToAvoid = "";
    if (tcw.memory.currentRequest.isPresent) {
        var creq = pv.getRequestorById(tcw.memory.currentRequest.get.requestorId);
        if (creq.isPresent && pv.manhattan(creq.get.element.pos, tcw.element.pos) < 3)
            requestorToAvoid = creq.get.element.id;
    }
    // search for collections first
    var collectedAmount = 0;
    var collectableAmount = tcw.emptyStorage();
    if (mem.currentRequest.isPresent && mem.currentRequest.get.resourceRequestType == pv.PUSH_REQUEST)
        collectedAmount += mem.currentRequest.get.amount;
    mem.collection.forEach(function (cr) { collectedAmount += cr.amount; });
    var cvec = new RRVec(mem.collection);
    queueDll.forEach(function (entry) {
        if (collectedAmount >= collectableAmount)
            return;
        var rr = entry.elem;
        if (rr.requestorId == requestorToAvoid)
            return;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PUSH_REQUEST)
            return;
        var amt = Math.min(rr.amount, collectableAmount - collectedAmount);
        if (amt > 0) {
            rr.amount -= amt;
            collectedAmount += amt;
            pv.log(["transporter", "assignRequest", "debug"], function () { return "transporter/assignRequest: pushing " + rr.requestorId + " to " + tcw.element.name + ".collection for " + amt + " of " + rr.resourceType + "."; });
            var rrNew = {
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt,
                isBlocker: rr.isBlocker
            };
            cvec.push(rrNew);
            queueDll.remove(entry);
        }
    });
    // how much can be collected from storage if required
    var storedCollectable = Math.min(collectableAmount, pv.resourceAmount(storedrr, resourceType));
    var storedCollected = 0;
    // search for deliveries
    var deliverableAmount = tcw.resourceAmount(resourceType) + collectedAmount;
    var deliveredAmount = 0;
    if (mem.currentRequest.get && mem.currentRequest.get.resourceRequestType == pv.PULL_REQUEST)
        deliveredAmount += mem.currentRequest.get.amount;
    mem.delivery.forEach(function (dr) { deliveredAmount += dr.amount; });
    var dvec = new RRVec(mem.delivery);
    queueDll.forEach(function (entry) {
        if (deliveredAmount + storedCollected >= deliverableAmount + storedCollectable)
            return;
        var rr = entry.elem;
        if (rr.requestorId == requestorToAvoid)
            return;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PULL_REQUEST)
            return;
        // try to deliver from non-storage collections
        var amt = Math.min(rr.amount, deliverableAmount - deliveredAmount);
        // if required, try to deliver from storage collecitons
        var amtFromStorage = Math.min(rr.amount - amt, storedCollectable - storedCollected);
        if (amt + amtFromStorage > 0) {
            rr.amount -= (amt + amtFromStorage);
            deliveredAmount += amt;
            storedCollected += amtFromStorage;
            storedrr[resourceType] -= amtFromStorage;
            pv.log(["transporter", "assignRequest", "debug"], function () { return "transporter/assignRequest: pushing " + rr.requestorId + " to " + tcw.element.name + ".delivery for " + (amt + amtFromStorage) + " of " + rr.resourceType + "."; });
            var rrNew = {
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt + amtFromStorage,
                isBlocker: rr.isBlocker
            };
            dvec.push(rrNew);
            queueDll.remove(entry);
        }
    });
    if (storedCollected > 0 && tcw.element.room.storage) {
        var rrNew_1 = {
            roomName: tcw.element.pos.roomName,
            resourceType: resourceType,
            resourceRequestType: pv.PUSH_REQUEST,
            requestorId: tcw.element.room.storage.id,
            amount: storedCollected,
            isBlocker: false
        };
        pv.log(["transporter", "assignRequest", "debug"], function () { return "transporter/assignRequest: pushing " + rrNew_1.requestorId + " to " + tcw.element.name + ".collection for " + rrNew_1.amount + " of " + rrNew_1.resourceType + "."; });
        cvec.push(rrNew_1);
    }
    else if (deliveredAmount < collectedAmount && tcw.element.room.storage) {
        var rrNew_2 = {
            roomName: tcw.element.pos.roomName,
            resourceType: resourceType,
            resourceRequestType: pv.PULL_REQUEST,
            requestorId: tcw.element.room.storage.id,
            amount: collectedAmount - deliveredAmount,
            isBlocker: false
        };
        pv.log(["transporter", "assignRequest", "debug"], function () { return "transporter/assignRequest: pushing " + rrNew_2.requestorId + " to " + tcw.element.name + ".delivery for " + rrNew_2.amount + " of " + rrNew_2.resourceType + "."; });
        dvec.push(rrNew_2);
    }
    tcw.preprocess(pv);
}
function rrToString(rr, pv) {
    return rr.requestorId + " " + (rr.resourceRequestType == pv.PULL_REQUEST ? "PULL" : "PUSH") + " " + rr.resourceType + ", " + rr.amount + (rr.isBlocker ? ", isBlocker" : "");
}
