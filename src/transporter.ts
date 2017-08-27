import mopt = require('./option');
import mdict = require('./dictionary');

export function makeTransporterOrder(orderName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        name: `${pv.CREEP_TYPE_TRANSPORTER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
        addOnBody: [MOVE, CARRY],
        maxEnergy: 3000,
        memory: makeTransporterMemory(pv)
    }
}

function makeTransporterMemory(pv: Paraverse): TransporterMemory {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0,
        job: mopt.None<ResourceRequest>(),
        amountWhenFree: 0
    };
}

interface TransporterMemory extends CreepMemory {
    job: Option<ResourceRequest>;
    amountWhenFree: number;
}

export class TransporterCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: TransporterMemory;
    resourceRequests: ResourceRequest[];
    private statusCache: number;
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = <TransporterMemory>creep.memory;
        this.resourceRequests = [];
        this.statusCache = -1;
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

    process(pv: Paraverse) {
        let status = this.getStatus(pv);
        if (!this.memory.job.isPresent)
            return;
        let job = this.memory.job.get;
        let requestorOpt = pv.getRequestorById(job.requestorId);
        if (!requestorOpt.isPresent)
            return;
        let requestor = requestorOpt.get;
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
                throw new Error(`Transporter ${this.element.name} has unexpected status ${status}.`);
        }

    }

    resourceAmount(resourceType: string): number {
        if (this.element.carry[resourceType] === undefined)
            return 0;
        else
            return this.element.carry[resourceType];
    }

    assignRequest(request: ResourceRequest, pv: Paraverse): void {
        this.memory.amountWhenFree = this.resourceAmount(request.resourceType);
        let assignedAmount: number = 0;
        if (request.resourceRequestType == pv.PUSH_REQUEST)
            assignedAmount = Math.min(this.emptyStorage(), request.amount);
        else
            assignedAmount = Math.min(this.resourceAmount(request.resourceType), request.amount);
        this.memory.job = mopt.Some<ResourceRequest>({
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
    }

    emptyStorage(): number {
        return this.element.carryCapacity - mdict.sum(this.element.carry);
    }

    //Warning: this function depends on the resourceRequests of the target
    // which is set only after the constructor of the target has been called.
    // So, for example, do not cache this function in the constructor.
    getStatus(pv: Paraverse): number {
        if (this.statusCache == -1) {
            if (!this.memory.job.isPresent) {
                this.statusCache = TransporterCreepWrapper.FREE;
            } else {
                let rr = this.memory.job.get;
                if (rr.resourceRequestType == pv.PULL_REQUEST) {
                    this.statusCache = this.getPullStatus(rr, pv);
                } else if (rr.resourceRequestType == pv.PUSH_REQUEST) {
                    this.statusCache = this.getPushStatus(rr, pv);
                } else {
                    throw new Error(`creep ${this.element.name} has unexpected resourceRequestType ${rr.resourceRequestType}`);
                }
            }
        }
        return this.statusCache;
    }

    private getPushStatus(job: ResourceRequest, pv: Paraverse): number {
        let result: number = TransporterCreepWrapper.PUSH;
        let carry = this.element.carry[job.resourceType];
        if (carry == 0 // if empty
            || carry < this.memory.amountWhenFree // or delivered some amount already
        ) {
            result = TransporterCreepWrapper.FREE; // set to FREE
        } else {
            let optRequestor = pv.getRequestorById(job.requestorId);
            if (!optRequestor.isPresent) {  // if requestor has died
                result = TransporterCreepWrapper.FREE; // set to FREE
            } else {
                let requestorResourceRequests =
                    optRequestor.get.resourceRequests.filter(
                        rrr => rrr.resourceType == job.resourceType && rrr.amount > 0 && rrr.resourceRequestType == pv.PULL_REQUEST
                    );
                if (requestorResourceRequests.length == 0) // if requestor is no longer requesting
                    result = TransporterCreepWrapper.FREE; // set to free
                else
                    result = TransporterCreepWrapper.PUSH; // else if all is good, set to PUSH
            }
        }

        // if free status, then reset job to free
        if (result == TransporterCreepWrapper.FREE) {
            this.memory.job = mopt.None<ResourceRequest>();
        }

        return result;

    }

    private getPullStatus(job: ResourceRequest, pv: Paraverse): number {
        let result: number = TransporterCreepWrapper.PULL;
        let space = this.element.carryCapacity - mdict.sum(this.element.carry);
        let carry = this.element.carry[job.resourceType];
        if (space == 0 // if already full 
            || carry > this.memory.amountWhenFree // or collected some amount already
        ) {
            result = TransporterCreepWrapper.FREE;
        } else {
            let optRequestor = pv.getRequestorById(job.requestorId);
            if (!optRequestor.isPresent) { // if requestor has died
                result = TransporterCreepWrapper.FREE;
            } else {
                let requestorResourceRequests =
                    optRequestor.get.resourceRequests.filter(
                        rrr => rrr.resourceType == job.resourceType && rrr.amount > 0 && rrr.resourceRequestType == pv.PUSH_REQUEST
                    );
                if (requestorResourceRequests.length == 0) // if requestor is no longer requesting
                    result = TransporterCreepWrapper.FREE;
                else
                    result = TransporterCreepWrapper.PULL;
            }
        }

        // if free, then reset job to free
        if (result == TransporterCreepWrapper.FREE) {
            this.memory.job = mopt.None<ResourceRequest>();
        }

        return result;
    }

    static FREE: number = 0;
    static PUSH: number = 1;
    static PULL: number = 2;

    isFree(pv: Paraverse): boolean {
        return this.getStatus(pv) == TransporterCreepWrapper.FREE || !this.memory.job.isPresent;
    }

}

function getLatestRequests(room: Room, pv: Paraverse): ResourceRequest[] {
    let crr = pv.getMyCreepsByRoom(room).map(cw => cw.resourceRequests);
    let srr = pv.getMyStructuresByRoom(room).map(sw => sw.resourceRequests);
    let result: ResourceRequest[] = [];
    crr.forEach(crr2 => crr2.forEach(rr => result.push(rr)));
    srr.forEach(srr2 => srr2.forEach(rr => result.push(rr)));
    return result;
}

class ResourceRequestMapping {
    // map from requestorId -> resourceType -> resourceRequestType -> latest ResourceRequest[]
    map: Dictionary<Dictionary<Dictionary<ResourceRequest>>>;
    constructor(rrs: ResourceRequest[]) {
        this.map = {};
        rrs.forEach(rr => this.add(rr));
    }
    add(rr: ResourceRequest): void {
        mdict.getOrAdd(
            mdict.getOrAdd(
                this.map,
                rr.requestorId,
                {}),
            rr.resourceType,
            {}
        )[rr.resourceRequestType.toString()] = rr;
    }
    get(requestorId: string, resourceType: string, resourceRequestType: string): Option<ResourceRequest> {
        let res =
            mdict.getOrElse(
                mdict.getOrElse(
                    mdict.getOrElse(
                        this.map,
                        requestorId,
                        {}
                    ),
                    resourceType,
                    {}
                ),
                resourceRequestType,
                null
            );
        if (res == null)
            return mopt.None<ResourceRequest>();
        else
            return mopt.Some(res);
    }
}


// If latest requests have amount x and queue has amount y,
// replace y with min(x, y), and get rid of x
function adjustQueueWithLatest(
    requestQueue: Queue<ResourceRequest>,
    latestRequests: ResourceRequest[],
    pv: Paraverse
): void {

    let lrMapping = new ResourceRequestMapping(latestRequests);
    let rqMapping = new ResourceRequestMapping([]);

    for (let rqi = requestQueue.length(); rqi > 0; --rqi) {
        let top = requestQueue.pop().get;
        let olr = lrMapping.get(top.requestorId, top.resourceType, top.resourceRequestType.toString());
        if (olr.isPresent) {
            top.amount = Math.min(top.amount, olr.get.amount);
        }
        if (top.amount >= 0) {
            requestQueue.push(top);
            rqMapping.add(top);
        }
    }
    let unqueuedRequests = latestRequests.filter(rr =>
        !rqMapping.get(
            rr.requestorId,
            rr.resourceType,
            rr.resourceRequestType.toString()
        ).isPresent
    );
    unqueuedRequests.forEach(rr => {
        requestQueue.push(rr)
    });
}

function partitionTransporters(
    transporters: TransporterCreepWrapper[],
    freeTransporters: TransporterCreepWrapper[],
    unfreeTransporters: TransporterCreepWrapper[],
    pv: Paraverse
): void {
    for (let ti = 0; ti < transporters.length; ++ti) {
        let tr = transporters[ti];
        if (tr.isFree(pv)) {
            freeTransporters.push(tr);
        } else {
            unfreeTransporters.push(tr);
        }
    }
}

// remove transports in progress from request list.
function adjustLatestWithTransporters(latestRequests: ResourceRequest[], unfreeTransporters: TransporterCreepWrapper[]): ResourceRequest[] {
    let utMap = new ResourceRequestMapping(unfreeTransporters.map(tcw => tcw.memory.job.get));
    latestRequests.forEach(lr => {
        let uto = utMap.get(lr.requestorId, lr.resourceType, lr.resourceRequestType.toString());
        if (uto.isPresent)
            lr.amount -= uto.get.amount;
    });
    return latestRequests.filter(lr => lr.amount > 0);
}

export function manageResourcesForRoom(room: Room, pv: Paraverse): void {
    let requestQueue: Queue<ResourceRequest> = pv.getRequestQueue(room);
    let transporters =
        pv.getMyCreepsByRoomAndType(
            room, pv.CREEP_TYPE_TRANSPORTER
        ).map(cw => <TransporterCreepWrapper>cw);
    let latestRequests: ResourceRequest[] = getLatestRequests(room, pv);

    let freeTransporters: TransporterCreepWrapper[] = [];
    let unfreeTransporters: TransporterCreepWrapper[] = [];

    partitionTransporters(transporters, freeTransporters, unfreeTransporters, pv);

    // filter away (or reduce amount of) requests that are already in progress
    latestRequests = adjustLatestWithTransporters(latestRequests, unfreeTransporters);

    // reduce queued amount to latest requested amount
    // add unqueued requests to the queue
    adjustQueueWithLatest(requestQueue, latestRequests, pv);

    let topRequestSatisfied: boolean = false;
    do {
        topRequestSatisfied = false;
        let topRequestOpt = requestQueue.peek();
        if (topRequestOpt.isPresent) {
            let topRequest = topRequestOpt.get;
            if (topRequest.resourceRequestType == pv.PULL_REQUEST) {
                topRequestSatisfied = trySatisfyPull(topRequest, freeTransporters, latestRequests, pv);
            } else if (topRequest.resourceRequestType == pv.PUSH_REQUEST) {
                topRequestSatisfied = trySatisfyPush(topRequest, freeTransporters, pv);
            } else {
                throw new Error(`Invalid resourceRequestType ${topRequest.resourceRequestType} for ${topRequest.requestorId}`);
            }
        }
        if (topRequestSatisfied) {
            requestQueue.pop();
        }
    } while (topRequestSatisfied);
}

function trySatisfyPull(job: ResourceRequest, transporters: TransporterCreepWrapper[], otherRequests: ResourceRequest[], pv: Paraverse): boolean {
    let transportersWithResource = transporters.filter(tcw => tcw.isFree(pv) && tcw.resourceAmount(job.resourceType) > 0);
    while (job.amount >= 0 && transportersWithResource.length > 0) {
        let tr = transportersWithResource.pop();
        tr.assignRequest(job, pv);
    }
    if (job.amount <= 0) return true;
    let matchingPushes =
        otherRequests.filter(
            rr => rr.resourceType == job.resourceType
                && rr.resourceRequestType == TransporterCreepWrapper.PUSH
        );
    if (matchingPushes.length > 0) {
        trySatisfyPush(matchingPushes[0], transporters, pv);
    } else {
        if (pv.game.rooms[job.roomName] !== undefined && pv.game.rooms[job.roomName].storage !== undefined) {
            let storage = pv.game.rooms[job.roomName].storage;
            if (storage.store[job.resourceType] !== undefined && storage.store[job.resourceType] > 0) {
                trySatisfyPush(
                    {
                        roomName: job.roomName,
                        resourceType: job.resourceType,
                        resourceRequestType: pv.PUSH_REQUEST,
                        amount: Math.min(job.amount, storage.store[job.resourceType]),
                        requestorId: storage.id
                    },
                    transporters,
                    pv
                );
            }
        }
    }
    return false;
}

function trySatisfyPush(job: ResourceRequest, transporters: TransporterCreepWrapper[], pv: Paraverse): boolean {
    let validTransporters = transporters.filter(tcw => tcw.isFree(pv) && tcw.emptyStorage() > 0);
    while (job.amount > 0 && validTransporters.length > 0) {
        let vt = validTransporters.pop();
        vt.assignRequest(job, pv);
    }
    return job.amount <= 0;
}