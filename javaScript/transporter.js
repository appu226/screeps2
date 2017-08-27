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
        job: mopt.None(),
        amountWhenFree: 0
    };
}
var TransporterCreepWrapper = (function () {
    function TransporterCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = creep.memory;
        this.resourceRequests = [];
        this.statusCache = -1;
    }
    TransporterCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    TransporterCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    TransporterCreepWrapper.prototype.process = function (pv) {
        var status = this.getStatus(pv);
        if (!this.memory.job.isPresent)
            return;
        var job = this.memory.job.get;
        var requestorOpt = pv.getRequestorById(job.requestorId);
        if (!requestorOpt.isPresent)
            return;
        var requestor = requestorOpt.get;
        switch (status) {
            case TransporterCreepWrapper.FREE:
                return;
            case TransporterCreepWrapper.PULL:
                if (requestor.giveResourceToCreep(this.element, job.resourceType, job.amount) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, requestor.element.pos);
                }
                return;
            case TransporterCreepWrapper.PUSH:
                if (requestor.takeResourceFromCreep(this.element, job.resourceType, job.amount) == ERR_NOT_IN_RANGE) {
                    pv.moveCreep(this, requestor.element.pos);
                }
                return;
            default:
                throw new Error("Transporter " + this.element.name + " has unexpected status " + status + ".");
        }
    };
    TransporterCreepWrapper.prototype.resourceAmount = function (resourceType) {
        if (this.element.carry[resourceType] === undefined)
            return 0;
        else
            return this.element.carry[resourceType];
    };
    TransporterCreepWrapper.prototype.assignRequest = function (request, pv) {
        this.memory.amountWhenFree = this.resourceAmount(request.resourceType);
        var assignedAmount = 0;
        if (request.resourceRequestType == pv.PUSH_REQUEST)
            assignedAmount = Math.min(this.emptyStorage(), request.amount);
        else
            assignedAmount = Math.min(this.resourceAmount(request.resourceType), request.amount);
        this.memory.job = mopt.Some({
            roomName: request.roomName,
            resourceType: request.resourceType,
            amount: assignedAmount,
            requestorId: request.requestorId,
            resourceRequestType: request.resourceRequestType
        });
        request.amount -= assignedAmount;
        if (request.resourceRequestType == pv.PUSH_REQUEST)
            this.statusCache = TransporterCreepWrapper.PULL;
        else
            this.statusCache = TransporterCreepWrapper.PUSH;
    };
    TransporterCreepWrapper.prototype.emptyStorage = function () {
        return this.element.carryCapacity - mdict.sum(this.element.carry);
    };
    //Warning: this function depends on the resourceRequests of the target
    // which is set only after the constructor of the target has been called.
    // So, for example, do not cache this function in the constructor.
    TransporterCreepWrapper.prototype.getStatus = function (pv) {
        if (this.statusCache == -1) {
            if (!this.memory.job.isPresent) {
                this.statusCache = TransporterCreepWrapper.FREE;
            }
            else {
                var rr = this.memory.job.get;
                if (rr.resourceRequestType == pv.PULL_REQUEST) {
                    this.statusCache = this.getPullStatus(rr, pv);
                }
                else if (rr.resourceRequestType == pv.PUSH_REQUEST) {
                    this.statusCache = this.getPushStatus(rr, pv);
                }
                else {
                    throw new Error("creep " + this.element.name + " has unexpected resourceRequestType " + rr.resourceRequestType);
                }
            }
        }
        return this.statusCache;
    };
    TransporterCreepWrapper.prototype.getPushStatus = function (job, pv) {
        var result = TransporterCreepWrapper.PUSH;
        var carry = this.element.carry[job.resourceType];
        if (carry == 0 // if empty
            || carry < this.memory.amountWhenFree // or delivered some amount already
        ) {
            result = TransporterCreepWrapper.FREE; // set to FREE
        }
        else {
            var optRequestor = pv.getRequestorById(job.requestorId);
            if (!optRequestor.isPresent) {
                result = TransporterCreepWrapper.FREE; // set to FREE
            }
            else {
                var requestorResourceRequests = optRequestor.get.resourceRequests.filter(function (rrr) { return rrr.resourceType == job.resourceType && rrr.amount > 0 && rrr.resourceRequestType == pv.PULL_REQUEST; });
                if (requestorResourceRequests.length == 0)
                    result = TransporterCreepWrapper.FREE; // set to free
                else
                    result = TransporterCreepWrapper.PUSH; // else if all is good, set to PUSH
            }
        }
        // if free status, then reset job to free
        if (result == TransporterCreepWrapper.FREE) {
            this.memory.job = mopt.None();
        }
        return result;
    };
    TransporterCreepWrapper.prototype.getPullStatus = function (job, pv) {
        var result = TransporterCreepWrapper.PULL;
        var space = this.element.carryCapacity - mdict.sum(this.element.carry);
        var carry = this.element.carry[job.resourceType];
        if (space == 0 // if already full 
            || carry > this.memory.amountWhenFree // or collected some amount already
        ) {
            result = TransporterCreepWrapper.FREE;
        }
        else {
            var optRequestor = pv.getRequestorById(job.requestorId);
            if (!optRequestor.isPresent) {
                result = TransporterCreepWrapper.FREE;
            }
            else {
                var requestorResourceRequests = optRequestor.get.resourceRequests.filter(function (rrr) { return rrr.resourceType == job.resourceType && rrr.amount > 0 && rrr.resourceRequestType == pv.PUSH_REQUEST; });
                if (requestorResourceRequests.length == 0)
                    result = TransporterCreepWrapper.FREE;
                else
                    result = TransporterCreepWrapper.PULL;
            }
        }
        // if free, then reset job to free
        if (result == TransporterCreepWrapper.FREE) {
            this.memory.job = mopt.None();
        }
        return result;
    };
    TransporterCreepWrapper.prototype.isFree = function (pv) {
        return this.getStatus(pv) == TransporterCreepWrapper.FREE || !this.memory.job.isPresent;
    };
    return TransporterCreepWrapper;
}());
TransporterCreepWrapper.FREE = 0;
TransporterCreepWrapper.PUSH = 1;
TransporterCreepWrapper.PULL = 2;
exports.TransporterCreepWrapper = TransporterCreepWrapper;
function manageResources(pv) {
    for (var roomName in pv.game.rooms) {
        manageResourcesForRoom(pv.game.rooms[roomName], pv);
    }
}
exports.manageResources = manageResources;
function getLatestRequests(room, pv) {
    var crr = pv.getMyCreepsByRoom(room).map(function (cw) { return cw.resourceRequests; });
    var srr = pv.getMyStructuresByRoom(room).map(function (sw) { return sw.resourceRequests; });
    var result = [].concat(crr, srr);
    return result;
}
var ResourceRequestMapping = (function () {
    function ResourceRequestMapping(rrs) {
        this.map = {};
        rrs.forEach(this.add);
    }
    ResourceRequestMapping.prototype.add = function (rr) {
        mdict.getOrAdd(mdict.getOrAdd(this.map, rr.requestorId, {}), rr.resourceType, {})[rr.resourceRequestType.toString()] = rr;
    };
    ResourceRequestMapping.prototype.get = function (requestorId, resourceType, resourceRequestType) {
        var res = mdict.getOrElse(mdict.getOrElse(mdict.getOrElse(this.map, requestorId, {}), resourceType, {}), resourceRequestType, null);
        if (res == null)
            return mopt.None();
        else
            return mopt.Some(res);
    };
    return ResourceRequestMapping;
}());
// If latest requests have amount x and queue has amount y,
// replace y with min(x, y), and get rid of x
function adjustQueueWithLatest(requestQueue, latestRequests, pv) {
    var lrMapping = new ResourceRequestMapping(latestRequests);
    var rqMapping = new ResourceRequestMapping([]);
    for (var rqi = requestQueue.length(); rqi > 0; --rqi) {
        var top_1 = requestQueue.pop().get;
        var olr = lrMapping.get(top_1.requestorId, top_1.resourceType, top_1.resourceRequestType.toString());
        if (olr.isPresent) {
            top_1.amount = Math.min(top_1.amount, olr.get.amount);
        }
        if (top_1.amount >= 0) {
            requestQueue.push(top_1);
            rqMapping.add(top_1);
        }
    }
    var unqueuedRequests = latestRequests.filter(function (rr) {
        return !rqMapping.get(rr.requestorId, rr.resourceType, rr.resourceRequestType.toString()).isPresent;
    });
    unqueuedRequests.forEach(function (rr) {
        requestQueue.push(rr);
    });
}
function partitionTransporters(transporters, freeTransporters, unfreeTransporters, pv) {
    for (var ti = 0; ti < transporters.length; ++ti) {
        var tr = transporters[ti];
        if (tr.isFree(pv)) {
            freeTransporters.push(tr);
        }
        else {
            unfreeTransporters.push(tr);
        }
    }
}
// remove transports in progress from request list.
function adjustLatestWithTransporters(latestRequests, unfreeTransporters) {
    var utMap = new ResourceRequestMapping(unfreeTransporters.map(function (tcw) { return tcw.memory.job.get; }));
    latestRequests.forEach(function (lr) {
        var uto = utMap.get(lr.requestorId, lr.resourceType, lr.resourceRequestType.toString());
        if (uto.isPresent)
            lr.amount -= uto.get.amount;
    });
    return latestRequests.filter(function (lr) { return lr.amount > 0; });
}
function manageResourcesForRoom(room, pv) {
    var requestQueue = pv.getRequestQueue(room);
    var transporters = pv.getMyCreepsByRoomAndType(room, pv.CREEP_TYPE_TRANSPORTER).map(function (cw) { return cw; });
    var latestRequests = getLatestRequests(room, pv);
    var freeTransporters = [];
    var unfreeTransporters = [];
    partitionTransporters(transporters, freeTransporters, unfreeTransporters, pv);
    // filter away (or reduce amount of) requests that are already in progress
    latestRequests = adjustLatestWithTransporters(latestRequests, unfreeTransporters);
    // reduce queued amount to latest requested amount
    // add unqueued requests to the queue
    adjustQueueWithLatest(requestQueue, latestRequests, pv);
    var topRequestSatisfied = false;
    do {
        topRequestSatisfied = false;
        var topRequestOpt = requestQueue.peek();
        if (topRequestOpt.isPresent) {
            var topRequest = topRequestOpt.get;
            if (topRequest.resourceRequestType == pv.PULL_REQUEST) {
                topRequestSatisfied = trySatisfyPull(topRequest, freeTransporters, latestRequests, pv);
            }
            else if (topRequest.resourceRequestType == pv.PUSH_REQUEST) {
                topRequestSatisfied = trySatisfyPush(topRequest, freeTransporters, pv);
            }
            else {
                throw new Error("Invalid resourceRequestType " + topRequest.resourceRequestType + " for " + topRequest.requestorId);
            }
        }
        if (topRequestSatisfied) {
            requestQueue.pop();
        }
    } while (topRequestSatisfied);
}
function trySatisfyPull(job, transporters, otherRequests, pv) {
    var transportersWithResource = transporters.filter(function (tcw) { return tcw.isFree(pv) && tcw.resourceAmount(job.resourceType) > 0; });
    while (job.amount >= 0 && transportersWithResource.length > 0) {
        var tr = transportersWithResource.pop();
        tr.assignRequest(job, pv);
    }
    if (job.amount <= 0)
        return true;
    var matchingPushes = otherRequests.filter(function (rr) { return rr.resourceType == job.resourceType
        && rr.resourceRequestType == TransporterCreepWrapper.PUSH; });
    if (matchingPushes.length > 0) {
        trySatisfyPush(matchingPushes[0], transporters, pv);
    }
    else {
        if (pv.game.rooms[job.roomName] !== undefined && pv.game.rooms[job.roomName].storage !== undefined) {
            var storage = pv.game.rooms[job.roomName].storage;
            if (storage.store[job.resourceType] !== undefined && storage.store[job.resourceType] > 0) {
                trySatisfyPush({
                    roomName: job.roomName,
                    resourceType: job.resourceType,
                    resourceRequestType: pv.PUSH_REQUEST,
                    amount: Math.min(job.amount, storage.store[job.resourceType]),
                    requestorId: storage.id
                }, transporters, pv);
            }
        }
    }
    return false;
}
function trySatisfyPush(job, transporters, pv) {
    var validTransporters = transporters.filter(function (tcw) { return tcw.isFree(pv) && tcw.emptyStorage() > 0; });
    while (job.amount > 0 && validTransporters.length > 0) {
        var vt = validTransporters.pop();
        vt.assignRequest(job, pv);
    }
    return job.amount <= 0;
}
