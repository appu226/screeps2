import o = require('./option');

function makeResourceRequest(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string): ResourceRequest {
    return {
        requestorId: requestorId,
        isRequestorCreep: isRequestorCreep,
        resourceType: resourceType,
        roomName: roomName
    };
}

function compareString(lhs: string, rhs: string): number {
    if (lhs < rhs) return -1;
    else if (lhs == rhs) return 0;
    else return 1;
}

function compareHelper(results: number[]): number {
    for (let i = 0; i < results.length; ++i) {
        if (results[i] != 0)
            return results[i];
    }
    return 0;
}

function compareBoolean(lhs: boolean, rhs: boolean): number {
    return (lhs ? 1 : 0) - (rhs ? 1 : 0);
}

function compareResourceRequest(lhs: ResourceRequest, rhs: ResourceRequest): number {
    return compareHelper([
        compareString(lhs.requestorId, rhs.requestorId),
        compareBoolean(lhs.isRequestorCreep, rhs.isRequestorCreep),
        compareString(lhs.resourceType, rhs.resourceType)
    ]);
}

export function pushResourceRequest(
    queueData: QueueData<ResourceRequest>,
    roomName: string,
    requestorId: string, isRequestorCreep: boolean,
    resourceType: string, amount: number,
    numTransportersInTransit: number,
    pv: Paraverse
) {
    let queue = o.makeQueue<ResourceRequest>(queueData.pushStack, queueData.popStack);
    let rr = makeResourceRequest(roomName, requestorId, isRequestorCreep, resourceType);
    let numScheduledEntries = queue.count((resourceRequest: ResourceRequest) => compareResourceRequest(rr, resourceRequest) == 0);
    let alreadyScheduledAmount = (numScheduledEntries + numTransportersInTransit) * pv.DELIVERY_AMOUNT;
    while (alreadyScheduledAmount < amount) {
        alreadyScheduledAmount += pv.DELIVERY_AMOUNT;
        queue.push(rr);
    }
}