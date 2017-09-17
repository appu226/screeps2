import mopt = require('./option');
import mdict = require('./dictionary');
import mterr = require('./terrain');

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
            let closest = mopt.maxBy(eligible, rr => mterr.euclidean(this.element.pos, pv.getRequestorById(rr.requestorId).get.element.pos, pv) * -1);
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
    // queuedrr.forEach(rr => pv.log.debug(`from memory ${rrToString(rr, pv)}`));

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
        tcw.memory.collection.forEach(rr => currentmap.subtract(rr, pv));
        tcw.memory.delivery.forEach(rr => currentmap.subtract(rr, pv));
        if (tcw.memory.currentRequest.isPresent)
            currentmap.subtract(tcw.memory.currentRequest.get, pv);
    });


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
    // queueDll.forEach(entry => pv.log.debug(`after makeDLList ${rrToString(entry.elem, pv)}`));
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
    // queueDll.forEach(entry => pv.log.debug(`preAssignment ${rrToString(entry.elem, pv)}`));
    transporters.forEach(tcw => {
        let mem = tcw.memory;
        if (mem.collection.length == 0 && mem.delivery.length == 0 && !mem.currentRequest.isPresent) {
            queuedResourceTypes.forEach(rt => { assignRequest(tcw, queueDll, rt, pv); });
        }
    });

    // put queueDll back into queuerr
    pv.getRoomMemory(room).queuedResourceRequests = queueDll.toArray();
    // pv.getRoomMemory(room).queuedResourceRequests.forEach(rr => pv.log.debug(`postAssignment ${rrToString(rr, pv)}`));


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

function assignRequest(tcw: TransporterCreepWrapper, queueDll: DLList<ResourceRequest>, resourceType: string, pv: Paraverse) {
    let mem = tcw.memory;
    if (mem.currentRequest.isPresent || mem.delivery.length > 0 || mem.collection.length > 0) return;

    // search for collections first
    let collectableAmount = tcw.emptyStorage();
    let collectedAmount = 0;
    queueDll.forEach(entry => {
        if (collectedAmount >= collectableAmount) return;
        let rr = entry.elem;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PUSH_REQUEST) return;
        let amt = Math.min(rr.amount, collectableAmount - collectedAmount);
        if (amt > 0) {
            rr.amount -= amt;
            collectedAmount += amt;
            // pv.log.debug(`transporter/assignRequest: pushing ${rr.requestorId} to ${tcw.element.name}.collection for ${amt} of ${rr.resourceType}.`);
            tcw.memory.collection.push({
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt,
                isBlocker: rr.isBlocker
            });
        }
        if (rr.amount <= 0) queueDll.remove(entry);
    });

    // search for deliveries
    let deliverableAmount = tcw.resourceAmount(resourceType) + collectedAmount;
    let deliveredAmount = 0;
    queueDll.forEach(entry => {
        if (deliveredAmount >= deliverableAmount) return;
        let rr = entry.elem;
        if (rr.resourceType != resourceType || rr.resourceRequestType != pv.PULL_REQUEST) return;
        let amt = Math.min(rr.amount, deliverableAmount - deliveredAmount);
        if (amt > 0) {
            rr.amount -= amt;
            deliveredAmount += amt;
            // pv.log.debug(`transporter/assignRequest: pushing ${rr.requestorId} to ${tcw.element.name}.delivery for ${amt} of ${rr.resourceType}.`);
            tcw.memory.delivery.push({
                roomName: rr.roomName,
                resourceType: rr.resourceType,
                resourceRequestType: rr.resourceRequestType,
                requestorId: rr.requestorId,
                amount: amt,
                isBlocker: rr.isBlocker
            });
        }
        if (rr.amount <= 0) queueDll.remove(entry);
    });
    tcw.preprocess(pv);
}

function rrToString(rr: ResourceRequest, pv: Paraverse): string {
    return `${rr.requestorId} ${rr.resourceRequestType == pv.PULL_REQUEST ? "PULL" : "PUSH"} ${rr.resourceType}, ${rr.amount}${rr.isBlocker ? ", isBlocker" : ""}`;
}