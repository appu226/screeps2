import o = require('./option');


export function moveCreep(cw: CreepWrapper, pos: RoomPosition, pv: Paraverse): boolean {
    return cw.creep.moveTo(pos) == OK;
}

export function makeCreepWrapper(c: Creep, pv: Paraverse): CreepWrapper {
    switch ((<CreepMemory>c.memory).creepType) {
        case pv.CREEP_TYPE_BUILDER:
            return new BuilderCreepWrapper(c, pv);
        case pv.CREEP_TYPE_HARVESTER:
            return new HarvesterCreepWrapper(c, pv);
        case pv.CREEP_TYPE_TRANSPORTER:
            return new TransporterCreepWrapper(c, pv);
        case pv.CREEP_TYPE_UPGRADER:
            return new UpgraderCreepWrapper(c, pv);
        default:
            pv.log.error(`makeCreepWrapper: creep ${c.name} of type ${(<CreepMemory>c.memory).creepType} not yet supported.`);
            return new MiscCreepWrapper(c, (<CreepMemory>c.memory).creepType);
    }

}

function tokenize(comboString: string, delim: string): string[] {
    let i = 0;
    let result: string[] = [];
    while (i < comboString.length) {
        if (i == 0 || comboString[i] == delim[0]) {
            result.push("");
        } else {
            result[result.length - 1] += comboString[i];
        }
        ++i;
    }
    return result;
}

export function makeCreepOrder(orderName: string, creepType: string, pv: Paraverse): CreepOrder {
    switch (creepType) {
        case pv.CREEP_TYPE_BUILDER: return makeBuilderOrder(orderName, pv);
        case pv.CREEP_TYPE_HARVESTER: return makeHarvesterOrder(orderName, tokenize(orderName, "_")[1], pv);
        case pv.CREEP_TYPE_TRANSPORTER: return makeTransporterOrder(orderName, tokenize(orderName, "_")[1], pv);
        case pv.CREEP_TYPE_UPGRADER: return makeUpgraderOrder(orderName, tokenize(orderName, "_")[1], pv);
        default: throw new Error(`creep/makeCreepOrder: creepType ${creepType} not yet supported.`)
    }
}
//---------------- COMMON UTILS ---------------------
function pushEfficiency(memory: CreepMemory, efficiency: number, maxSize: number = 50): void {
    let eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack)
    eq.push(efficiency);
    memory.totalEfficiency += efficiency;
    while (eq.length() > maxSize && maxSize >= 0) {
        memory.totalEfficiency -= eq.pop().get;
    }
}

function getEfficiency(memory: CreepMemory): number {
    let eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
    if (eq.isEmpty()) return 0;
    else return memory.totalEfficiency / eq.length();
}

//---------------- UPGRADER -------------------------
function makeUpgraderOrder(orderName: string, roomName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_UPGRADER,
        name: `${pv.CREEP_TYPE_UPGRADER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [MOVE, MOVE, CARRY, WORK],
        maxEnergy: 3000,
        memory: makeUpgraderMemory(roomName, pv)
    }
}

function makeUpgraderMemory(roomName: string, pv: Paraverse): UpgraderMemory {
    return {
        roomName: roomName,
        creepType: pv.CREEP_TYPE_UPGRADER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface UpgraderMemory extends CreepMemory {
    roomName: string
}

class UpgraderCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: UpgraderMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_UPGRADER;
        this.memory = <UpgraderMemory>creep.memory;
    }

    process(pv: Paraverse) {
        let roomName = this.memory.roomName;
        let room = Game.rooms[roomName];
        if(room === undefined) {
            this.pushEfficiency(0);
            throw new Error(`${this.creep.name} could not find room ${roomName}`);
        }
        let creep = this.creep;
        let controller = room.controller;
        let upgradeResult = creep.upgradeController(controller);
        switch(upgradeResult) {
            case OK: {
                this.pushEfficiency(1);
                break;
            }
            case ERR_NOT_IN_RANGE: {
                this.pushEfficiency(moveCreep(this, controller.pos, pv) ? 1 : 0);
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY: {
                this.pushEfficiency(0);
                break;
            }
            default: {
                this.pushEfficiency(0);
                throw new Error(`${creep.name} upgrading ${roomName} failed with code ${upgradeResult}.`);
            }
        }
    }

    pushEfficiency(efficiency: number): void {
        pushEfficiency(this.memory, efficiency);
    }
    getEfficiency(): number {
        return getEfficiency(this.memory);
    }
}


//---------------- TRANSPORTER ----------------------
function makeTransporterOrder(orderName: string, roomName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_TRANSPORTER,
        name: `${pv.CREEP_TYPE_TRANSPORTER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, MOVE, CARRY, MOVE, CARRY],
        addOnBody: [MOVE, CARRY],
        maxEnergy: 3000,
        memory: makeTransporterMemory(roomName, pv)
    }
}

function makeTransporterMemory(roomName: string, pv: Paraverse): TransporterMemory {
    return {
        roomName: roomName,
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
    roomName: string;
    sourceId: string;
    sourceType: string;
    destinationId: string;
    destinationType: string;
    resourceType: string;
    status: string;
}

class TransporterCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: TransporterMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_TRANSPORTER;
        this.memory = <TransporterMemory>creep.memory;
    }

    process(pv: Paraverse) {
        switch(this.memory.status) {
            case "free": return this.free(pv);
            case "collecting": return this.collecting(pv);
            case "transporting": return this.transporting(pv);
            default: {
                pv.log.error(`Creep ${this.creep.name} has unrecognized status ${this.memory.status}`);
                this.memory.status = "free";
                this.pushEfficiency(0);
                return;
            }
        }
    }

    free(pv: Paraverse): void {
        let creep = this.creep;
        let terrain = pv.getTerrainWithStructures(creep.room);
        let validMoves: XY[] = [];
        let checkForObstacle = function(dx: number, dy: number): boolean {
            let x = creep.pos.x + dx;
            let y = creep.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) return;
            if (terrain[x][y] != pv.TERRAIN_CODE_PLAIN && terrain[x][y] != pv.TERRAIN_CODE_SWAMP)
                return false;
            validMoves.push({x: x, y: y});
        };
        let nextToObstacle: boolean = 
            checkForObstacle(0, 1) ||
            checkForObstacle(0, -1) ||
            checkForObstacle(-1, 0) ||
            checkForObstacle(1, 0);
        if(nextToObstacle && validMoves.length > 0) {
            let randomValidMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            let newPos = creep.room.getPositionAt(randomValidMove.x, randomValidMove.y);
            moveCreep(this, newPos, pv);
        }
        this.pushEfficiency(0);
    }

    collecting(pv: Paraverse): void {
        let creep = this.creep;
        let memory = this.memory;
        let collectionStatus: number = 0;
        let sourceObject: Creep|Structure = null;
        switch(memory.sourceType) {
            case "creep": {
                let sourceCreep = pv.game.getObjectById<Creep>(memory.sourceId);
                collectionStatus = sourceCreep.transfer(creep, memory.resourceType);
                sourceObject = sourceCreep;
                break;
            }
            case "structure": {
                let sourceStructure = pv.game.getObjectById<Structure>(memory.sourceId);
                collectionStatus = creep.withdraw(sourceStructure, memory.resourceType);
                sourceObject = sourceStructure;
                break;
            }
            default: {
                this.pushEfficiency(0)
                throw new Error(`Unexpected sourceType "${memory.sourceType}", expecting "creep" or "structure"`);
            }
        }
        switch(collectionStatus) {
            case ERR_NOT_IN_RANGE: {
                this.pushEfficiency(
                    moveCreep(this, sourceObject.pos, pv) ? 1 : 0
                );
                break;
            }
            case ERR_NOT_ENOUGH_ENERGY:
            case ERR_NOT_ENOUGH_RESOURCES:
            case OK: {
                if(creep.carry[memory.resourceType] > 0) {
                    pv.log.debug(`${creep.name} status changing to transporting.`);
                    memory.status = "transporting";
                    this.pushEfficiency(1);
                }
                break;
            }
            default: {
                this.pushEfficiency(0);
                break;
            }
        }
    }

    transporting(pv: Paraverse): void {
        let creep = this.creep;
        let memory = this.memory;
        if (creep.carry[memory.resourceType] == 0) {
            pv.log.debug(`${creep.name} status changing to free.`);
            memory.status = "free";
            this.pushEfficiency(1);
            return;
        }
        let destination = pv.game.getObjectById<Creep|Structure>(memory.destinationId);
        let transferResult = creep.transfer(destination, memory.resourceType);
        if (transferResult == ERR_NOT_IN_RANGE) {
            this.pushEfficiency(moveCreep(this, destination.pos, pv) ? 1 : 0);
        } else if (transferResult == OK) {
            this.pushEfficiency(1);
        } else {
            this.pushEfficiency(0);
        }
    }

    pushEfficiency(efficiency: number): void {
        pushEfficiency(this.memory, efficiency);
    }
    getEfficiency(): number {
        return getEfficiency(this.memory);
    }
}

//---------------- BUILDER --------------------------
function makeBuilderOrder(orderName: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_BUILDER,
        name: `${pv.CREEP_TYPE_BUILDER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, CARRY, CARRY],
        addOnBody: [MOVE, CARRY, WORK, CARRY],
        maxEnergy: 1000,
        memory: makeBuilderMemory(pv)
    };
}

function makeBuilderMemory(pv: Paraverse): BuilderMemory {
    return {
        constructionSiteId: o.None<string>(),
        creepType: pv.CREEP_TYPE_BUILDER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface BuilderMemory extends CreepMemory {
    constructionSiteId: Option<string>
}

class BuilderCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: BuilderMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_BUILDER;
        this.memory = <BuilderMemory>creep.memory;
    }

    process(pv: Paraverse) {
        let cs: ConstructionSite = null;

        if (this.memory.constructionSiteId !== undefined && this.memory.constructionSiteId.isPresent) {
            cs = pv.game.getObjectById<ConstructionSite>(this.memory.constructionSiteId.get);
        }

        if (cs == null) {
            let constructionSites = pv.getConstructionSitesFromRoom(this.creep.room);
            if (constructionSites.length == 0) {
                pv.constructNextSite(this.creep.room);
            } else {
                cs = constructionSites[0];
            }
        }
        if (cs != null) {
            let buildAttempt = this.creep.build(cs);
            if (buildAttempt == ERR_NOT_IN_RANGE) {
                moveCreep(this, cs.pos, pv);
                this.pushEfficiency(0);
            } else if (buildAttempt == OK) {
                this.pushEfficiency(1);
            } else {
                this.pushEfficiency(0);
            }
            this.memory.constructionSiteId = o.Some<string>(cs.id);
        } else {
            this.pushEfficiency(0);
            this.memory.constructionSiteId = o.None<string>();
        }
    }

    pushEfficiency(efficiency: number): void {
        pushEfficiency(this.memory, efficiency);
    }
    getEfficiency(): number {
        return getEfficiency(this.memory);
    }
}

//-------------------- MISC --------------------------------
class MiscCreepWrapper implements CreepWrapper {
    constructor(creep: Creep, creepType: string) {
        this.creep = creep;
        this.creepType = creepType
    }
    creep: Creep;
    creepType: string;
    process(pv: Paraverse) {
        this.creep.say(`creep/MiscCreepWrapper/process: processing creep ${this.creep.name} of type ${this.creepType}.`);
    }
    pushEfficiency(efficiency: number): void { }
    getEfficiency(): number { return 0; }
}

//------------------- HARVESTER ------------------------------
export function isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string, pv: Paraverse): boolean {
    return creepWrapper.creepType == pv.CREEP_TYPE_HARVESTER &&
        (<HarvesterCreepWrapper>creepWrapper).memory.sourceId == sourceId;
}


function makeHarvesterOrder(orderName: string, sourceId: string, pv: Paraverse): CreepOrder {
    return {
        creepType: pv.CREEP_TYPE_HARVESTER,
        name: `${pv.CREEP_TYPE_HARVESTER}_${pv.getUid()}`,
        orderName: orderName,
        basicBody: [MOVE, CARRY, WORK, WORK],
        addOnBody: [CARRY, WORK, WORK],
        maxEnergy: 1000,
        memory: makeHarvesterMemory(sourceId, pv)
    };
}

function makeHarvesterMemory(sourceId: string, pv: Paraverse): HarvesterMemory {
    return {
        sourceId: sourceId,
        creepType: pv.CREEP_TYPE_HARVESTER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0
    }
}

interface HarvesterMemory extends CreepMemory {
    sourceId: string;
}

class HarvesterCreepWrapper implements CreepWrapper {
    creep: Creep;
    creepType: string;
    memory: HarvesterMemory;
    constructor(creep: Creep, pv: Paraverse) {
        this.creep = creep;
        this.creepType = pv.CREEP_TYPE_HARVESTER;
        this.memory = <HarvesterMemory>creep.memory;
    }

    roomHasTransporters(pv: Paraverse): boolean {
        return pv.getMyCreeps().filter(
            cw =>
                cw.creepType == pv.CREEP_TYPE_TRANSPORTER &&
                cw.creep.room.name == this.creep.room.name
        ).length > 0;
    }

    process(pv: Paraverse) {
        if (this.creep.carry.energy < this.creep.carryCapacity) {
            let source = pv.game.getObjectById<Source>(this.memory.sourceId);
            let harvestAttempt = this.creep.harvest(source);
            if (harvestAttempt == ERR_NOT_IN_RANGE) {
                this.pushEfficiency(0);
                moveCreep(this, source.pos, pv);
            } else if (source.energy == 0) {
                this.pushEfficiency(0)
            } else {
                this.pushEfficiency(1);
            }
        } else {
            this.pushEfficiency(0);
            if (!this.roomHasTransporters(pv)) {
                let spawns =
                    pv.getMyStructures().filter(
                        sw =>
                            sw.structure.structureType == STRUCTURE_SPAWN &&
                            sw.structure.room.name == this.creep.room.name
                    );
                if (spawns.length > 0) {
                    let spawn = spawns[0].structure;
                    if (this.creep.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                        moveCreep(this, spawn.pos, pv);
                    }
                }
                pv.scheduleCreep(this.creep.room.name, `${pv.CREEP_TYPE_TRANSPORTER}_${this.creep.room.name}`, pv.CREEP_TYPE_TRANSPORTER, .5);
            }
        }
    }

    pushEfficiency(efficiency: number): void {
        pushEfficiency(this.memory, efficiency);
    }
    getEfficiency(): number {
        return getEfficiency(this.memory);
    }
}