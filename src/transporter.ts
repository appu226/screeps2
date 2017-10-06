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
        collection: [],
        delivery: [],
        currentAmount: 0,
        currentRequest: mopt.None<ResourceRequest>(),
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    };
}

interface TransporterMemory extends CreepMemory {
    collection: ResourceRequest[];
    delivery: ResourceRequest[];
    currentAmount: number;
    currentRequest: Option<ResourceRequest>;
}

export class TransporterCreepWrapper implements CreepWrapper {
    element: Creep;
    creepType: string;
    memory: TransporterMemory;
    resourceRequests: ResourceRequest[];
    constructor(creep: Creep, pv: Paraverse) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = <TransporterMemory>creep.memory;
        this.resourceRequests = [];
    }

    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number {
        return this.element.transfer(creep, resourceType, amount);
    }
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number {
        return creep.transfer(this.element, resourceType, amount);
    }

    preprocess(pv: Paraverse) {
        let m = this.memory;

        // reset currentRequest if object dies or amount changes
        if (m.currentRequest.isPresent) {
            let cr = m.currentRequest.get;
            if (this.resourceAmount(cr.resourceType) != m.currentAmount
                || !pv.getRequestorById(cr.requestorId).isPresent) {
                m.currentRequest = mopt.None<ResourceRequest>();
                // pv.log.debug(`transporter/preprocess: resetting ${this.element.name} to free.`);
            }
        }

        // try to find next request
        if (!m.currentRequest.isPresent) {
            if (m.collection.length == 0 && m.delivery.length == 0) return;

            //delete dead requests
            m.collection = m.collection.filter(rr => pv.getRequestorById(rr.requestorId).isPresent);
            m.delivery = m.delivery.filter(rr => pv.getRequestorById(rr.requestorId).isPresent);

            if (m.collection.length == 0 && m.delivery.length == 0) return;

            // find satisfyable resource requests
            let eligible: ResourceRequest[] = [];
            let es = this.emptyStorage();
            m.collection.forEach(rr => { if (rr.amount <= es) eligible.push(rr); });
            if (eligible.length == 0) m.collection.forEach(rr => eligible.push(rr));
            if (m.delivery.length > 0) {
                let ra = this.resourceAmount(m.delivery[0].resourceType);
                m.delivery.forEach(rr => { if (rr.amount <= ra) eligible.push(rr); });
            }
            if (eligible.length == 0) m.delivery.forEach(rr => eligible.push(rr));

            //find closest satisfyable request
            let closest = mopt.maxBy(eligible, rr => pv.manhattan(this.element.pos, pv.getRequestorById(rr.requestorId).get.element.pos) * -1);
            if (!closest.isPresent) {
                m.collection = [];
                m.delivery = [];
                return;
            }
            //remove closest satisfyable from pending request lists
            m.collection = m.collection.filter(rr => rr != closest.get.elem);
            m.delivery = m.delivery.filter(rr => rr != closest.get.elem);

            m.currentRequest = mopt.Some(closest.get.elem);
            // pv.log.debug(`transporter/preprocess: assigned ${this.element.name} to ${m.currentRequest.get.requestorId}.`);
            m.currentAmount = this.resourceAmount(m.currentRequest.get.resourceType);
        }
    }

    process(pv: Paraverse) {
        if (!this.memory.currentRequest.isPresent) {
            pv.avoidObstacle(this);
            pv.pushEfficiency(this.memory, this.element.ticksToLive < 50 ? 1 : 0);
            return;
        }
        let cr = this.memory.currentRequest.get;
        let orqor = pv.getRequestorById(cr.requestorId);
        if (!orqor.isPresent) {
            this.memory.currentRequest = mopt.None<ResourceRequest>();
            pv.pushEfficiency(this.memory, this.element.ticksToLive < 50 ? 1 : 0);
            return;
        }

        let rqor = orqor.get;
        let res: number = OK;
        switch (cr.resourceRequestType) {
            case pv.PUSH_REQUEST: {
                res = rqor.giveResourceToCreep(this.element, cr.resourceType, Math.min(cr.amount, this.emptyStorage()))
                break;
            }
            case pv.PULL_REQUEST: {
                res = rqor.takeResourceFromCreep(this.element, cr.resourceType, Math.min(cr.amount, this.resourceAmount(cr.resourceType)));
                break;
            }
            default:
                throw new Error(`Creep ${this.element.name} hit an unexpected request type ${cr.resourceRequestType}`);
        }
        if (res == ERR_NOT_IN_RANGE) {
            pv.moveCreep(this, rqor.element.pos);
        } else
            this.memory.currentRequest = mopt.None<ResourceRequest>();

        pv.pushEfficiency(this.memory, 1);
    }

    resourceAmount(resourceType: string): number {
        if (this.element.carry[resourceType] === undefined)
            return 0;
        else
            return this.element.carry[resourceType];
    }

    emptyStorage(): number {
        return this.element.carryCapacity - mdict.sum(this.element.carry);
    }
}

class RRMap {
    pullmap: Dictionary<Dictionary<ResourceRequest>>;
    pushmap: Dictionary<Dictionary<ResourceRequest>>;

    static makeMap(rrArray: ResourceRequest[]): Dictionary<Dictionary<ResourceRequest>> {
        let rrtypeToArray = mdict.arrayToDictionary(rrArray, (rr: ResourceRequest) => rr.resourceType);
        return mdict.mapValues(
            rrtypeToArray,
            (rrarray: ResourceRequest[]) => {
                let ridToArray = mdict.arrayToDictionary(rrarray, (rr: ResourceRequest) => rr.requestorId);
                return mdict.mapValues(ridToArray, (rrArray: ResourceRequest[]) => {
                    if (rrArray.length == 0)
                        throw new Error("Impossibility: found empty ResourceRequestMap in ResourceRequestArray");
                    else if (rrArray.length == 1)
                        return rrArray[0];
                    else
                        throw new Error("Impossibility: found more than one ResourceRequest for a map entry.")
                });
            }
        );
    }

    constructor(rrArray: ResourceRequest[], pv: Paraverse) {
        this.pullmap = RRMap.makeMap(rrArray.filter(rr => rr.resourceRequestType == pv.PULL_REQUEST));
        this.pushmap = RRMap.makeMap(rrArray.filter(rr => rr.resourceRequestType == pv.PUSH_REQUEST));
    }

    subtract(rr: ResourceRequest, pv: Paraverse): void {
        let map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        if (map[rr.resourceType] === undefined || map[rr.resourceType][rr.requestorId] === undefined) return;
        map[rr.resourceType][rr.requestorId].amount -= rr.amount;
        if (map[rr.resourceType][rr.requestorId].amount <= 0)
            delete map[rr.resourceType][rr.requestorId];
    }
    add(rr: ResourceRequest, pv: Paraverse): boolean {
        let map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        if (map[rr.resourceType] === undefined || map[rr.resourceType][rr.requestorId] === undefined)
            return false;
        else {
            map[rr.resourceType][rr.requestorId].amount += rr.amount;
            map[rr.resourceType][rr.requestorId].isBlocker = rr.isBlocker;
            return true;
        }
    }
    insert(rr: ResourceRequest, pv: Paraverse): void {
        let map = rr.resourceRequestType == pv.PULL_REQUEST ? this.pullmap : this.pushmap;
        let map2 = mdict.getOrAdd(map, rr.resourceType, {});
        if (map2[rr.requestorId] === undefined)
            map2[rr.requestorId] = rr;
        else {
            map2[rr.requestorId].amount += rr.amount;
            map2[rr.requestorId].isBlocker = rr.isBlocker;
        }
    }
}

export function manageResourcesForRoom(room: Room, pv: Paraverse): void {
    // collect queued requests
    let queuedrr = pv.getRoomMemory(room).queuedResourceRequests;
    queuedrr.forEach(rr => pv.log(["transporter", "manageResourcesForRoom", "debug"], () => `from memory ${rrToString(rr, pv)}`));

    // collect all current requests
    let currentrr =
        mopt.flatten(pv.getMyCreepsByRoom(room).map(cw => cw.resourceRequests)).concat(
            mopt.flatten(pv.getMyStructuresByRoom(room).map(sw => sw.resourceRequests)));

    // collect transporters
    let transporters = pv.getMyCreepsByRoomAndType(room, pv.CREEP_TYPE_TRANSPORTER).map(cw => <TransporterCreepWrapper>cw);
    transporters.forEach(tcw => tcw.preprocess(pv));

    // remove requests in progress from currentrr
    let currentmap = new RRMap(currentrr, pv);
    transporters.forEach(tcw => {
        tcw.memory.collection.forEach(rr => { currentmap.subtract(rr, pv) });
        tcw.memory.delivery.forEach(rr => currentmap.subtract(rr, pv));
        if (tcw.memory.currentRequest.isPresent)
            currentmap.subtract(tcw.memory.currentRequest.get, pv);
    });

    // collect stored resources, and account for to-be-collected resources
    let storedrr = getStoredResources(room, pv);
    if (room.storage) {
        transporters.forEach(tcw => {
            tcw.memory.collection.forEach(rr => {
                if (rr.requestorId == room.storage.id) storedrr[rr.resourceType] -= Math.min(rr.amount, storedrr[rr.resourceType]);
            });
        });
    }


    // replace queued amount with current amount
    queuedrr.forEach(qrr => { qrr.amount = 0; qrr.isBlocker = false; });
    let queuedmap = new RRMap(queuedrr, pv);
    let unqueued: ResourceRequest[] = [];
    currentrr.forEach(rr => {
        if (rr.amount > 0 && !queuedmap.add(rr, pv)) {
            unqueued.push(rr);
            queuedmap.insert(rr, pv);
        }
    });
    unqueued.forEach(rr => { queuedrr.push(rr); });

    // remove empty requests
    let queueDll = mopt.makeDLList(queuedrr);
    queueDll.forEach(entry => pv.log(["transporter", "manageResourcesForRoom", "debug"], () => `after makeDLList ${rrToString(entry.elem, pv)}`));
    let queuedResourceTypes: string[] = [];
    let qrrSet: Dictionary<boolean> = {};
    queueDll.forEach(rre => {
        if (rre.elem.amount <= 0)
            queueDll.remove(rre);
        else if (qrrSet[rre.elem.resourceType] === undefined) {
            queuedResourceTypes.push(rre.elem.resourceType);
            qrrSet[rre.elem.resourceType] = true;
        }
    });
    if (queueDll.length == 0) return;

    // try to assign resourceTypes to free transporters
    queueDll.forEach(entry => pv.log(["transporter", "manageResourcesForRoom", "debug"], () => `preAssignment ${rrToString(entry.elem, pv)}`));
    transporters.sort((a, b) => {
        let an = a.element.name;
        let bn = b.element.name;
        if (an == bn) return 0;
        else if (an < bn) return 1;
        else return -1;
    })
    transporters.forEach(tcw => {
        let mem = tcw.memory;
        queuedResourceTypes.forEach(rt => { assignRequest(tcw, queueDll, rt, storedrr, pv); });
    });

    // put queueDll back into queuerr
    pv.getRoomMemory(room).queuedResourceRequests = queueDll.toArray();
    pv.getRoomMemory(room).queuedResourceRequests.forEach(rr => pv.log(["transporter", "manageResourcesForRoom", "debug"], () => `postAssignment ${rrToString(rr, pv)}`));


    if (
        pv.getMyCreepsByRoom(room).length * 3 / 4 >= transporters.length  // not more than 3/4ths should be transporters
        && pv.getTransporterEfficiency(room) > .9 // transporters should not be idle
        && avoidableBlocker(pv.getRoomMemory(room).queuedResourceRequests, pv) // transporters should make a difference
    ) {
        pv.scheduleCreep(
            room,
            pv.makeTransporterOrder(`Transporter_${room.name}`),
            4
        );
    }
}

function getStoredResources(room: Room, pv: Paraverse): Dictionary<number> {
    if (room.storage === undefined || room.storage == null) return {};
    let store = room.storage.store;
    let result: Dictionary<number> = {};
    for (let resource in store)
        result[resource] = store[resource];
    return result;
}

// check whether there is a pending request that is a blocker
// that could have been avoided if we had more transporters
function avoidableBlocker(queuedRequests: ResourceRequest[], pv: Paraverse): boolean {
    let blockers = queuedRequests.filter(rr => rr.isBlocker);
    if (blockers.length == 0)
        return false;
    return blockers.some(rr => {
        return rr.isBlocker
            && blockers.some(rr2 => {
                return rr.resourceRequestType != rr2.resourceRequestType
                    && rr.resourceType == rr2.resourceType
                    && rr2.amount > 0;
            });
    });
}

class RRVec {
    vec: ResourceRequest[];
    map: Dictionary<ResourceRequest>;
    constructor(_vec: ResourceRequest[]) {
        this.vec = _vec;
        this.map = {};
        _vec.forEach(rr => { this.map[rr.requestorId] = rr; });
    }
    push(rr: ResourceRequest) {
        if (this.map[rr.requestorId] !== undefined) {
            this.map[rr.requestorId].amount += rr.amount;
        } else {
            this.map[rr.requestorId] = rr;
            this.vec.push(rr);
        }
    }
}

function assignRequest(tcw: TransporterCreepWrapper, queueDll: DLList<ResourceRequest>, resourceType: string, storedrr: Dictionary<number>, pv: Paraverse) {
    let mem = tcw.memory;

    // if transporter is already assigned, return
    if (mem.currentRequest.isPresent || mem.delivery.length > 0 || mem.collection.length > 0) return;

    // do not mess with requestor the transporter is just about to deal with
    let requestorToAvoid: string = "";
    if (tcw.memory.currentRequest.isPresent) {
        let creq = pv.getRequestorById(tcw.memory.currentRequest.get.requestorId);
        if (creq.isPresent && pv.manhattan(creq.get.element.pos, tcw.element.pos) < 3)
            requestorToAvoid = creq.get.element.id;
    }

    // search for collections first
    let collectedAmount = 0;
    let collectableAmount = tcw.emptyStorage();
    if (mem.currentRequest.isPresent && mem.currentRequest.get.resourceRequestType == pv.PUSH_REQUEST) collectedAmount += mem.currentRequest.get.amount;
    mem.collection.forEach(cr => { collectedAmount += cr.amount; });
    let cvec = new RRVec(mem.collection);
    queueDll.forEach(entry => {
        if (collectedAmount >= collectableAmount) return;
        let rr = entry.elem;
        if (rr.requestorId == requestorToAvoid) return;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PUSH_REQUEST) return;
        let amt = Math.min(rr.amount, collectableAmount - collectedAmount);
        if (amt > 0) {
            rr.amount -= amt;
            collectedAmount += amt;
            pv.log(["transporter", "assignRequest", "debug"], () => `transporter/assignRequest: pushing ${rr.requestorId} to ${tcw.element.name}.collection for ${amt} of ${rr.resourceType}.`);
            let rrNew: ResourceRequest = {
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
    let storedCollectable = Math.min(collectableAmount, pv.resourceAmount(storedrr, resourceType));
    let storedCollected = 0;

    // search for deliveries
    let deliverableAmount = tcw.resourceAmount(resourceType) + collectedAmount;
    let deliveredAmount = 0;
    if (mem.currentRequest.get && mem.currentRequest.get.resourceRequestType == pv.PULL_REQUEST) deliveredAmount += mem.currentRequest.get.amount;
    mem.delivery.forEach(dr => { deliveredAmount += dr.amount; });
    let dvec = new RRVec(mem.delivery);
    queueDll.forEach(entry => {
        if (deliveredAmount + storedCollected >= deliverableAmount + storedCollectable) return;
        let rr = entry.elem;
        if (rr.requestorId == requestorToAvoid) return;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PULL_REQUEST) return;

        // try to deliver from non-storage collections
        let amt = Math.min(rr.amount, deliverableAmount - deliveredAmount);
        // if required, try to deliver from storage collecitons
        let amtFromStorage = Math.min(rr.amount - amt, storedCollectable - storedCollected);

        if (amt + amtFromStorage > 0) {
            rr.amount -= (amt + amtFromStorage);
            deliveredAmount += amt;
            storedCollected += amtFromStorage;
            pv.log(["transporter", "assignRequest", "debug"], () => `transporter/assignRequest: pushing ${rr.requestorId} to ${tcw.element.name}.delivery for ${amt + amtFromStorage} of ${rr.resourceType}.`);
            let rrNew: ResourceRequest = {
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
        let rrNew: ResourceRequest = {
            roomName: tcw.element.pos.roomName,
            resourceType: resourceType,
            resourceRequestType: pv.PUSH_REQUEST,
            requestorId: tcw.element.room.storage.id,
            amount: storedCollected,
            isBlocker: false
        };
        pv.log(["transporter", "assignRequest", "debug"], () => `transporter/assignRequest: pushing ${rrNew.requestorId} to ${tcw.element.name}.collection for ${rrNew.amount} of ${rrNew.resourceType}.`);
        cvec.push(rrNew);
    } else if (deliveredAmount < collectedAmount && tcw.element.room.storage) {
        let rrNew: ResourceRequest = {
            roomName: tcw.element.pos.roomName,
            resourceType: resourceType,
            resourceRequestType: pv.PULL_REQUEST,
            requestorId: tcw.element.room.storage.id,
            amount: collectedAmount - deliveredAmount,
            isBlocker: false
        };
        pv.log(["transporter", "assignRequest", "debug"], () => `transporter/assignRequest: pushing ${rrNew.requestorId} to ${tcw.element.name}.delivery for ${rrNew.amount} of ${rrNew.resourceType}.`);
        dvec.push(rrNew);
    }

    tcw.preprocess(pv);
}

function rrToString(rr: ResourceRequest, pv: Paraverse): string {
    return `${rr.requestorId} ${rr.resourceRequestType == pv.PULL_REQUEST ? "PULL" : "PUSH"} ${rr.resourceType}, ${rr.amount}${rr.isBlocker ? ", isBlocker" : ""}`;
}