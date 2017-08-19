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
        sourceId: "",
        sourceType: "",
        destinationId: "",
        destinationType: "",
        resourceType: "",
        status: "free"
    };
}

interface TransporterMemory extends CreepMemory {
    sourceId: string;
    sourceType: string;
    destinationId: string;
    destinationType: string;
    resourceType: string;
    status: string;
}

export class TransporterCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: TransporterMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = <TransporterMemory>creep.memory;
        switch (this.memory.status) {
            case "collecting":
                pv.recordCollectionIntent(this.memory.sourceId, this.memory.resourceType);
                pv.recordDeliveryIntent(this.memory.destinationId, this.memory.resourceType);
                break;
            case "transporting":
                pv.recordDeliveryIntent(this.memory.destinationId, this.memory.resourceType);
                break;
            default:
                break;
        }
    }

    process(pv: Paraverse) {
        switch (this.memory.status) {
            case "free": return this.free(pv);
            case "collecting": return this.collecting(pv);
            case "transporting": return this.transporting(pv);
            default: {
                pv.log.error(`Creep ${this.creep.name} has unrecognized status ${this.memory.status}`);
                this.memory.status = "free";
                pv.pushEfficiency(this.memory, 0);
                return;
            }
        }
    }

    free(pv: Paraverse): void {
        pv.avoidObstacle(this);
        pv.pushEfficiency(this.memory, 0);
    }

    failAndResetToFree(reason: string, pv: Paraverse): void {
        this.memory.status = "free";
        pv.log.debug(reason);
        pv.pushEfficiency(this.memory, 0);
    }

    collecting(pv: Paraverse): void {
        let creep = this.creep;
        let memory = this.memory;
        let collectionStatus: number = 0;
        let sourceObject: Creep | Structure = null;
        switch (memory.sourceType) {
            case "creep": {
                let sourceCreep = pv.game.getObjectById<Creep>(memory.sourceId);
                if (sourceCreep == null)
                    return this.failAndResetToFree(
                        `Freeing transporter ${creep.name} because it couldn't find source ${memory.sourceId}`,
                        pv
                    );
                collectionStatus = sourceCreep.transfer(creep, memory.resourceType);
                if (sourceCreep.carry[memory.resourceType] == 0) {
                    collectionStatus = ERR_NOT_ENOUGH_ENERGY;
                }
                sourceObject = sourceCreep;
                break;
            }
            case "structure": {
                let sourceStructure = pv.game.getObjectById<Structure>(memory.sourceId);
                if (sourceStructure == null)
                    return this.failAndResetToFree(
                        `Freeing transporter ${creep.name} because it couldn't find source ${memory.sourceId}`,
                        pv
                    );
                collectionStatus = creep.withdraw(sourceStructure, memory.resourceType);
                sourceObject = sourceStructure;
                break;
            }
            default: {
                pv.pushEfficiency(memory, 0)
                throw new Error(`Unexpected sourceType "${memory.sourceType}", expecting "creep" or "structure"`);
            }
        }
        switch (collectionStatus) {
            case ERR_NOT_IN_RANGE: {
                pv.pushEfficiency(
                    memory, pv.moveCreep(this, sourceObject.pos) ? 1 : 0
                );
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_NOT_ENOUGH_RESOURCES:
            case ERR_FULL:
            case OK: {
                if (creep.carry[memory.resourceType] > 0) {
                    pv.log.debug(`${creep.name} status changing to transporting.`);
                    memory.status = "transporting";
                    pv.pushEfficiency(memory, 1);
                }
                break;
            }
            default: {
                pv.pushEfficiency(memory, 0);
                break;
            }
        }
    }

    transporting(pv: Paraverse): void {
        let creep = this.creep;
        let memory = this.memory;
        if (creep.carry[memory.resourceType] == 0) {
            return this.succeedAndSetToFree(pv);
        }
        let destination = pv.game.getObjectById<Creep | Structure>(memory.destinationId);
        if (destination == null)
            return this.failAndResetToFree(
                `Freeing transporter ${this.creep.name} because it couldn't find destination ${memory.destinationId}`,
                pv
            );
        let transferResult = creep.transfer(destination, memory.resourceType);
        if (transferResult == ERR_NOT_IN_RANGE) {
            pv.pushEfficiency(memory, pv.moveCreep(this, destination.pos) ? 1 : 0);
        } else if (transferResult == OK) {
            pv.pushEfficiency(memory, 1);
        } else if (transferResult == ERR_FULL) {
            if (creep.carry[memory.resourceType] >= 50) {
                this.giveToClosestExtension(creep, memory, pv);
            } else
                this.succeedAndSetToFree(pv);
        }
        else {
            pv.pushEfficiency(memory, 0);
        }
    }

    succeedAndSetToFree(pv: Paraverse): void {
        pv.log.debug(`${this.creep.name} status changing to free.`);
        this.memory.status = "free";
        pv.pushEfficiency(this.memory, 1);
    }

    giveToClosestExtension(creep: Creep, memory: TransporterMemory, pv: Paraverse) {
        let emptyExtensions = pv.getMyStructuresByRoomAndType(
            creep.room,
            STRUCTURE_EXTENSION
        ).map(
            sw => <StructureExtension>sw.structure
            ).filter(
            se => se.energy < se.energyCapacity
            );
        if (emptyExtensions.length == 0)
            this.succeedAndSetToFree(pv);
        else {
            let closestEmptyExtension = creep.pos.findClosestByRange<StructureExtension>(emptyExtensions);
            memory.destinationType = "structure";
            memory.destinationId = closestEmptyExtension.id;
            pv.log.debug(`${this.creep.name} status changing destination to extension ${closestEmptyExtension.id}.`);
            pv.pushEfficiency(memory, 1);
        }
    }
}

export function isFreeTransporter(creepWrapper: CreepWrapper, pv: Paraverse): boolean {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        return false;
    let tcw = <TransporterCreepWrapper>creepWrapper;
    return tcw.memory.status == "free";
}

export function assignTransporter(creepWrapper: CreepWrapper, sourceRequest: ResourceRequest, destinationRequest: ResourceRequest, pv: Paraverse): void {
    if (creepWrapper.creepType != pv.CREEP_TYPE_TRANSPORTER)
        throw new Error(`assignTransporter: expected creep wrapper with type CREEP_TYPE_TRANSPORTER (${pv.CREEP_TYPE_TRANSPORTER}), got ${creepWrapper.creepType}`);
    let tcw = <TransporterCreepWrapper>creepWrapper;
    tcw.memory.destinationId = destinationRequest.requestorId;
    tcw.memory.destinationType = destinationRequest.isRequestorCreep ? "creep" : "structure";
    tcw.memory.resourceType = sourceRequest.resourceType;
    tcw.memory.sourceId = sourceRequest.requestorId;
    tcw.memory.sourceType = sourceRequest.isRequestorCreep ? "creep" : "structure";
    tcw.memory.status = "collecting";
}

