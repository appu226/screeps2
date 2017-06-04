"use strict";
var o = require("./option");
function makeResourceRequest(roomName, requestorId, isRequestorCreep, resourceType) {
    return {
        requestorId: requestorId,
        isRequestorCreep: isRequestorCreep,
        resourceType: resourceType,
        roomName: roomName
    };
}
function compareString(lhs, rhs) {
    if (lhs < rhs)
        return -1;
    else if (lhs == rhs)
        return 0;
    else
        return 1;
}
function compareHelper(results) {
    for (var i = 0; i < results.length; ++i) {
        if (results[i] != 0)
            return results[i];
    }
    return 0;
}
function compareBoolean(lhs, rhs) {
    return (lhs ? 1 : 0) - (rhs ? 1 : 0);
}
function compareResourceRequest(lhs, rhs) {
    return compareHelper([
        compareString(lhs.requestorId, rhs.requestorId),
        compareBoolean(lhs.isRequestorCreep, rhs.isRequestorCreep),
        compareString(lhs.resourceType, rhs.resourceType)
    ]);
}
function pushResourceRequest(queueData, roomName, requestorId, isRequestorCreep, resourceType, amount, numTransportersInTransit, pv) {
    var queue = o.makeQueue(queueData.pushStack, queueData.popStack);
    var rr = makeResourceRequest(roomName, requestorId, isRequestorCreep, resourceType);
    var numScheduledEntries = queue.count(function (resourceRequest) { return compareResourceRequest(rr, resourceRequest) == 0; });
    var alreadyScheduledAmount = (numScheduledEntries + numTransportersInTransit) * pv.DELIVERY_AMOUNT;
    while (alreadyScheduledAmount < amount) {
        alreadyScheduledAmount += 50;
        queue.push(rr);
    }
}
exports.pushResourceRequest = pushResourceRequest;
