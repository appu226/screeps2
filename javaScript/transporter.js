"use strict";
var mopt = require("./option");
var mdict = require("./dictionary");
var mterr = require("./terrain");
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
        currentRequest: mopt.None()
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
                pv.log.debug("transporter/preprocess: resetting " + this.element.name + " to free.");
            }
        }
        // try to find next request
        if (!m.currentRequest.isPresent) {
            if (m.collection.length == 0 && m.delivery.length == 0)
                return;
            //delete dead requests
            m.collection = m.collection.filter(function (rr) { return pv.getRequestorById(rr.requestorId).isPresent; });
            m.delivery = m.delivery.filter(function (rr) { return pv.getRequestorById(rr.requestorId).isPresent; });
            //if collections are empty, delete non-satisfyable deliveries
            if (m.collection.length == 0)
                m.delivery = m.delivery.filter(function (rr) { return rr.amount <= _this.resourceAmount(rr.resourceType); });
            //if deliveries are empty, delete non-satisfyable collections
            var es_1 = this.emptyStorage();
            if (m.delivery.length == 0)
                m.collection = m.collection.filter(function (rr) { return rr.amount <= es_1; });
            if (m.collection.length == 0 && m.delivery.length == 0)
                return;
            // find satisfyable resource requests
            var eligible_1 = [];
            m.collection.forEach(function (rr) { if (rr.amount <= es_1)
                eligible_1.push(rr); });
            if (m.delivery.length > 0) {
                var ra_1 = this.resourceAmount(m.delivery[0].resourceType);
                m.delivery.forEach(function (rr) { if (rr.amount <= ra_1)
                    eligible_1.push(rr); });
            }
            //find closest satisfyable request
            var closest_1 = mopt.maxBy(eligible_1, function (rr) { return mterr.euclidean(_this.element.pos, pv.getRequestorById(rr.requestorId).get.element.pos, pv) * -1; });
            if (!closest_1.isPresent) {
                m.collection = [];
                m.delivery = [];
                return;
            }
            //remove closest satisfyable from pending request lists
            m.collection = m.collection.filter(function (rr) { return rr != closest_1.get.elem; });
            m.delivery = m.delivery.filter(function (rr) { return rr != closest_1.get.elem; });
            m.currentRequest = mopt.Some(closest_1.get.elem);
            pv.log.debug("transporter/preprocess: assigned " + this.element.name + " to " + m.currentRequest.get.requestorId + ".");
            m.currentAmount = this.resourceAmount(m.currentRequest.get.resourceType);
        }
    };
    TransporterCreepWrapper.prototype.process = function (pv) {
        if (!this.memory.currentRequest.isPresent) {
            pv.avoidObstacle(this);
            return;
        }
        var cr = this.memory.currentRequest.get;
        var orqor = pv.getRequestorById(cr.requestorId);
        if (!orqor.isPresent) {
            this.memory.currentRequest = mopt.None();
            return;
        }
        var rqor = orqor.get;
        switch (cr.resourceRequestType) {
            case pv.PUSH_REQUEST: {
                if (rqor.giveResourceToCreep(this.element, cr.resourceType, Math.min(cr.amount, this.emptyStorage())) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, rqor.element.pos);
                }
                break;
            }
            case pv.PULL_REQUEST: {
                if (rqor.takeResourceFromCreep(this.element, cr.resourceType, Math.min(cr.amount, this.resourceAmount(cr.resourceType))) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, rqor.element.pos);
                }
                break;
            }
            default:
                throw new Error("Creep " + this.element.name + " hit an unexpected request type " + cr.resourceRequestType);
        }
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
        this.pullmap = RRMap.makeMap(rrArray.filter(function (rr) { return rr.resourceRequestType == pv.PULL_REQUEST && rr.amount > 0; }));
        this.pushmap = RRMap.makeMap(rrArray.filter(function (rr) { return rr.resourceRequestType == pv.PUSH_REQUEST && rr.amount > 0; }));
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
            return true;
        }
    };
    RRMap.prototype.insert = function (rr, pv) {
        var map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        var map2 = mdict.getOrAdd(map, rr.resourceType, {});
        if (map2[rr.requestorId] === undefined)
            map2[rr.requestorId] = rr;
        else
            map2[rr.requestorId].amount += rr.amount;
    };
    return RRMap;
}());
function manageResourcesForRoom(room, pv) {
    // collect queued requests
    var queuedrr = pv.getRoomMemory(room).queuedResourceRequests;
    // collect all current requests
    var currentrr = mopt.flatten(pv.getMyCreepsByRoom(room).map(function (cw) { return cw.resourceRequests; })).concat(mopt.flatten(pv.getMyStructuresByRoom(room).map(function (sw) { return sw.resourceRequests; })));
    // collect transporters
    var transporters = pv.getMyCreepsByRoomAndType(room, pv.CREEP_TYPE_TRANSPORTER).map(function (cw) { return cw; });
    transporters.forEach(function (tcw) { return tcw.preprocess(pv); });
    // remove requests in progress from currentrr
    var currentmap = new RRMap(currentrr, pv);
    transporters.forEach(function (tcw) {
        tcw.memory.collection.forEach(function (rr) { return currentmap.subtract(rr, pv); });
        tcw.memory.delivery.forEach(function (rr) { return currentmap.subtract(rr, pv); });
        if (tcw.memory.currentRequest.isPresent)
            currentmap.subtract(tcw.memory.currentRequest.get, pv);
    });
    // replace queued amount with current amount
    queuedrr.forEach(function (qrr) { return qrr.amount = 0; });
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
    transporters.forEach(function (tcw) {
        var mem = tcw.memory;
        if (mem.collection.length == 0 && mem.delivery.length == 0 && !mem.currentRequest.isPresent) {
            queuedResourceTypes.forEach(function (rt) { assignRequest(tcw, queueDll, rt, pv); });
        }
    });
    // put queueDll back into queuerr
    var newrr = queueDll.toArray().filter(function (rr) { return rr.amount > 0; });
    for (var rri = 0; rri < newrr.length; ++rri) {
        if (rri < queuedrr.length)
            queuedrr[rri] = newrr[rri];
        else
            queuedrr.push(newrr[rri]);
    }
    while (queuedrr.length > newrr.length)
        queuedrr.pop();
}
exports.manageResourcesForRoom = manageResourcesForRoom;
function assignRequest(tcw, queueDll, resourceType, pv) {
    var mem = tcw.memory;
    if (mem.currentRequest.isPresent || mem.delivery.length > 0 || mem.collection.length > 0)
        return;
    queueDll.forEach(function (entry) { if (entry.elem.amount <= 0)
        queueDll.remove(entry); });
    if (queueDll.length == 0)
        return;
    // search for collections first
    var collectableAmount = tcw.emptyStorage();
    var collectedAmount = 0;
    queueDll.forEach(function (entry) {
        if (collectedAmount >= collectableAmount)
            return;
        var rr = entry.elem;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PUSH_REQUEST)
            return;
        var amt = Math.min(rr.amount, collectableAmount - collectedAmount);
        if (amt > 0) {
            rr.amount -= amt;
            collectedAmount += amt;
            pv.log.debug("transporter/assignRequest: pushing " + rr.requestorId + " to " + tcw.element.name + ".collection for " + amt + " of " + rr.resourceType + ".");
            tcw.memory.collection.push({
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt
            });
        }
        if (rr.amount <= 0)
            queueDll.remove(entry);
    });
    // search for deliveries
    var deliverableAmount = tcw.resourceAmount(resourceType) + collectedAmount;
    var deliveredAmount = 0;
    queueDll.forEach(function (entry) {
        if (deliveredAmount >= deliverableAmount)
            return;
        var rr = entry.elem;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PULL_REQUEST)
            return;
        var amt = Math.min(rr.amount, deliverableAmount - deliveredAmount);
        if (amt > 0) {
            rr.amount -= amt;
            deliveredAmount += amt;
            pv.log.debug("transporter/assignRequest: pushing " + rr.requestorId + " to " + tcw.element.name + ".delivery for " + amt + " of " + rr.resourceType + ".");
            tcw.memory.delivery.push({
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt
            });
        }
        if (rr.amount <= 0)
            queueDll.remove(entry);
    });
    tcw.preprocess(pv);
}
