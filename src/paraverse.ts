import dictionary = require('./dictionary');
import mstructure = require('./structure');
import mMiscCreep = require('./miscCreep');
import mtransporter = require('./transporter');
import mbuilder = require('./builder');
import mharvester = require('./harvester');
import mupgrader = require('./upgrader');
import source = require('./source');
import o = require('./option');
import mlogger = require('./logger');
import mroom = require('./room');
import mterrain = require('./terrain');
import mrr = require('./resourceRequest');

interface ParaMemory extends Memory {
    logLevel: number;
    creepOrders: Dictionary<PQEntry<CreepOrder>[]>;
    terrainMap: Dictionary<number[][]>;
    terrainStructureMap: Dictionary<number[][]>
    plannedConstructionSites: Dictionary<PlannedConstructionSite[]>;
    sourceMemories: Dictionary<SourceMemory>;
    uid: number;
    resourceSendRequests: QueueData<ResourceRequest>;
    resourceReceiveRequests: QueueData<ResourceRequest>;
    towerMemory: Dictionary<TowerMemory>;
    wallHitPoints: Dictionary<number>;
}

export function makeParaverse(
    game: Game,
    map: GameMap,
    memory: Memory
): Paraverse {
    var paraMemory = <ParaMemory>memory;
    if (paraMemory.logLevel === undefined) paraMemory.logLevel = 4;
    if (paraMemory.creepOrders === undefined) paraMemory.creepOrders = {};
    if (paraMemory.terrainMap === undefined) paraMemory.terrainMap = {};
    if (paraMemory.terrainStructureMap === undefined) paraMemory.terrainStructureMap = {};
    if (paraMemory.plannedConstructionSites === undefined) paraMemory.plannedConstructionSites = {};
    if (paraMemory.sourceMemories === undefined) paraMemory.sourceMemories = {};
    if (paraMemory.uid === undefined) paraMemory.uid = game.time;
    if (paraMemory.resourceSendRequests === undefined) paraMemory.resourceSendRequests = { pushStack: [], popStack: [] };
    if (paraMemory.resourceReceiveRequests === undefined) paraMemory.resourceReceiveRequests = { pushStack: [], popStack: [] };
    if (paraMemory.towerMemory === undefined) paraMemory.towerMemory = {};
    if (paraMemory.wallHitPoints === undefined) paraMemory.wallHitPoints = {};

    return new ParaverseImpl(game, map, paraMemory);
}

class ParaverseImpl implements Paraverse {
    game: Game;
    map: GameMap;
    memory: ParaMemory;

    log: Logger;

    bodyPartPriority: Dictionary<number>;

    roomWrappers: Dictionary<RoomWrapper>;
    structureWrappers: Dictionary<StructureWrapper>;
    creepWrappers: Dictionary<CreepWrapper>;
    sourceWrappers: Dictionary<SourceWrapper>;
    deliveryIntent: Dictionary<Dictionary<number>>;
    collectionIntent: Dictionary<Dictionary<number>>;

    LOG_LEVEL_SILENT: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARN: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;

    CREEP_TYPE_BUILDER: string;
    CREEP_TYPE_HARVESTER: string;
    CREEP_TYPE_TRANSPORTER: string;
    CREEP_TYPE_UPGRADER: string;
    CREEP_TYPE_FOREIGNER: string;

    TERRAIN_CODE_PLAIN: number;
    TERRAIN_CODE_SWAMP: number;
    TERRAIN_CODE_WALL: number;
    TERRAIN_CODE_LAVA: number;

    STRUCTURE_CODE_SOURCE: number;
    STRUCTURE_CODE_TOWER: number;
    STRUCTURE_CODE_CWALL: number;
    STRUCTURE_CODE_SPAWN: number;
    STRUCTURE_CODE_EXTENSION: number;
    STRUCTURE_CODE_ROAD: number;
    STRUCTURE_CODE_RAMPART: number;
    STRUCTURE_CODE_KEEPER_LAIR: number;
    STRUCTURE_CODE_CONTROLLER: number;

    DELIVERY_AMOUNT: number;

    constructionSiteCache: Dictionary<ConstructionSite[]>;

    constructor(
        game: Game,
        map: GameMap,
        memory: ParaMemory
    ) {
        this.game = game;
        this.map = map;
        this.memory = memory;
        this.log = mlogger.createLogger(memory.logLevel, this);

        this.LOG_LEVEL_SILENT = 0;
        this.LOG_LEVEL_ERROR = 1;
        this.LOG_LEVEL_WARN = 2;
        this.LOG_LEVEL_INFO = 3;
        this.LOG_LEVEL_DEBUG = 4;

        this.CREEP_TYPE_BUILDER = "builder";
        this.CREEP_TYPE_HARVESTER = "harvester";
        this.CREEP_TYPE_TRANSPORTER = "transporter";
        this.CREEP_TYPE_UPGRADER = "upgrader";
        this.CREEP_TYPE_FOREIGNER = "foreigner";

        this.TERRAIN_CODE_PLAIN = 0;
        this.TERRAIN_CODE_SWAMP = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_WALL = TERRAIN_MASK_WALL;
        this.TERRAIN_CODE_LAVA = TERRAIN_MASK_SWAMP;

        this.STRUCTURE_CODE_SOURCE = 1000;
        this.STRUCTURE_CODE_TOWER = 1001;
        this.STRUCTURE_CODE_CWALL = 1002;
        this.STRUCTURE_CODE_SPAWN = 1003;
        this.STRUCTURE_CODE_EXTENSION = 1004;
        this.STRUCTURE_CODE_ROAD = 1005;
        this.STRUCTURE_CODE_RAMPART = 1006;
        this.STRUCTURE_CODE_KEEPER_LAIR = 1007;
        this.STRUCTURE_CODE_CONTROLLER = 1008;

        this.DELIVERY_AMOUNT = 150;
        this.deliveryIntent = {};
        this.collectionIntent = {};


        this.bodyPartPriority = {};
        this.bodyPartPriority[MOVE] = 1;
        this.bodyPartPriority[HEAL] = 0;
        this.bodyPartPriority[WORK] = 3;
        this.bodyPartPriority[TOUGH] = 4;
        this.bodyPartPriority[ATTACK] = 2;
        this.bodyPartPriority[RANGED_ATTACK] = 2;
        this.bodyPartPriority[CARRY] = 3;
        this.bodyPartPriority[CLAIM] = 3;

        this.constructionSiteCache = {};

        this.roomWrappers = {};
        this.structureWrappers = {};
        this.creepWrappers = {};
        this.sourceWrappers = {};

        let pv = this;
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            room.find<Structure>(FIND_STRUCTURES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.structureWrappers[s.id] = mstructure.makeStructureWrapper(s, pv); },
                        `Creating wrapper for ${s.structureType} ${s.id}`
                    );
                }
            );

            room.find<Creep>(FIND_CREEPS).forEach(
                (c) => {
                    o.tryCatch(
                        () => { this.creepWrappers[c.id] = pv.makeCreepWrapper(c); },
                        `Creating wrapper for creep ${c.name}`
                    );
                }
            );

            room.find<Source>(FIND_SOURCES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.sourceWrappers[s.id] = source.makeSourceWrapper(s, pv); },
                        `Creating wrapper for source ${s.id}`
                    );
                }
            );

            this.roomWrappers[room.name] = mroom.makeRoomWrapper(room);
        }

        //delete memory of dead crees
        for (let creepName in this.memory.creeps) {
            if(this.game.creeps[creepName] === undefined) {
                delete this.memory.creeps[creepName];
            }
        }

        //delete memory of dead spawns
        for (let spawnName in this.memory.spawns) {
            if (this.game.spawns[spawnName] === undefined) {
                delete this.game.spawns[spawnName];
            }
        }

        //delete memory of dead towers
        for (let towerId in this.memory.towerMemory) {
            let tower = this.game.getObjectById<StructureTower>(towerId);
            if (tower === undefined || tower == null)
                delete this.memory.towerMemory[towerId];
        }
    }

    getMyRooms(): RoomWrapper[] {
        return dictionary.getValues<RoomWrapper>(this.roomWrappers).filter(rw => rw.room.controller.my);
    }

    getMyStructures(): StructureWrapper[] {
        return dictionary.getValues<StructureWrapper>(this.structureWrappers).filter(sw => sw.my);
    }

    getMyCreeps(): CreepWrapper[] {
        return dictionary.getValues<CreepWrapper>(this.creepWrappers).filter(cw => cw.creep.my);
    }

    getMySources(): SourceWrapper[] {
        return dictionary.getValues<SourceWrapper>(this.sourceWrappers).filter(sw => sw.source.room.controller.my);
    }

    getSourceMemory(s: Source): SourceMemory {
        if (this.memory.sourceMemories[s.id] === undefined) {
            this.memory.sourceMemories[s.id] = source.makeSourceMemory(s, this);
        }
        return this.memory.sourceMemories[s.id];
    }

    getHostileCreeps(room: Room): Creep[] {
        return dictionary.getValues<CreepWrapper>(this.creepWrappers).filter(cw => !cw.creep.my && cw.creep.room.name == room.name).map(cw => cw.creep);
    }

    getCreepOrders(roomName: string): PQ<CreepOrder> {
        if (this.memory.creepOrders[roomName] === undefined) {
            this.memory.creepOrders[roomName] = [];
        }
        return o.wrapPriorityQueueData<CreepOrder>(this.memory.creepOrders[roomName]);
    }

    setLogLevel(logLevel: number): void {
        this.memory.logLevel = logLevel;
        this.log.setLogLevel(logLevel);
    }

    getConstructionSitesFromRoom(room: Room): ConstructionSite[] {
        if (this.constructionSiteCache[room.name] === undefined) {
            this.constructionSiteCache[room.name] = room.find<ConstructionSite>(FIND_CONSTRUCTION_SITES);
        }
        return this.constructionSiteCache[room.name];
    }

    scheduleCreep(roomName: string, order: CreepOrder, priority: number): void {
        // call getCreepOrders before looking at the raw entries
        let pq = this.getCreepOrders(roomName);
        if (this.memory.creepOrders[roomName].filter((pqe) => pqe.elem.orderName == order.orderName).length > 0) {
            return;
        } else {
            pq.push(order, priority - this.game.time / 20.0);
            return;
        }
    }

    removeCreepOrder(roomName: string, orderName: string): void {
        let pq = this.getCreepOrders(roomName);
        let creepOrders = this.memory.creepOrders[roomName];
        let elems = creepOrders.filter(pqe => pqe.elem.orderName == orderName)
        if (elems.length > 0) {
            let idx = elems[0].index;
            pq.prioritize(idx, creepOrders[0].priority + 1);
            pq.pop();
        }
    }

    makeBuilderOrder(orderName: string): CreepOrder { return mbuilder.makeBuilderOrder(orderName, this); }
    makeHarvesterOrder(orderName: string, sourceId: string): CreepOrder { return mharvester.makeHarvesterOrder(orderName, sourceId, this); }
    makeTransporterOrder(orderName: string): CreepOrder { return mtransporter.makeTransporterOrder(orderName, this); }
    makeUpgraderOrder(orderName: string, roomName: string): CreepOrder { return mupgrader.makeUpgraderOrder(orderName, roomName, this); }

    requestResourceReceive(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void {
        mrr.pushResourceRequest(
            this.memory.resourceReceiveRequests,
            roomName,
            requestorId, isRequestorCreep,
            resourceType, amount,
            this.getDeliveryIntent(requestorId, resourceType),
            this);
    }

    requestResourceSend(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void {
        mrr.pushResourceRequest(
            this.memory.resourceSendRequests,
            roomName,
            requestorId, isRequestorCreep,
            resourceType, amount,
            this.getCollectionIntent(requestorId, resourceType),
            this);
    }

    getReceiveRequests(): Queue<ResourceRequest> {
        let queueData = this.memory.resourceReceiveRequests;
        return o.makeQueue<ResourceRequest>(queueData.pushStack, queueData.popStack);
    }

    getSendRequests(): Queue<ResourceRequest> {
        let queueData = this.memory.resourceSendRequests;
        return o.makeQueue<ResourceRequest>(queueData.pushStack, queueData.popStack);
    }

    manageSupplyAndDemand(): void {
        let receiveRequests = this.getReceiveRequests();
        let sendRequests = this.getSendRequests();
        //go through the entire sendRequest queue, popping every request
        //requests that cannot be satisfied get pushed back into the queue
        //FIFO behavior guarantees that order of unsatisfied requests is preserved
        for (let isr = sendRequests.length(); isr > 0; --isr) {
            let sr = sendRequests.pop().get;
            let isRequestAssigned = false; // parameter to track whether request has been assigned to a transporter
            let destination = this.game.getObjectById<RoomObject>(sr.requestorId);
            if (destination != null) {
                let freeTransporters = this.getMyCreeps().filter((cw: CreepWrapper) => mtransporter.isFreeTransporter(cw, this));
                let closestTransporter = o.maxBy<CreepWrapper>(freeTransporters, (cw: CreepWrapper) => mterrain.euclidean(cw.creep.pos, destination.pos, this) * -1);
                if (closestTransporter.isPresent) {
                    let rro = receiveRequests.extract((rr: ResourceRequest) => rr.resourceType == sr.resourceType);
                    if (rro.isPresent) {
                        mtransporter.assignTransporter(closestTransporter.get.elem, sr, rro.get, this);
                        isRequestAssigned = true;
                    }
                }

                //if request could not be assigned, push it back into the queue
                if (!isRequestAssigned)
                    sendRequests.push(sr);
            }
        }

    }

    recordDeliveryIntent(destinationId: string, resourceName: string): void {
        if (this.deliveryIntent === undefined)
            this.deliveryIntent = {};
        let di = this.deliveryIntent;
        if (di[destinationId] === undefined)
            di[destinationId] = {};
        let ddi = di[destinationId];
        if (ddi[resourceName] === undefined)
            ddi[resourceName] = 0;
        ddi[resourceName] += 1;
    }
    recordCollectionIntent(sourceId: string, resourceName: string): void {
        if (this.collectionIntent === undefined)
            this.collectionIntent = {};
        let ci = this.collectionIntent;
        if (ci[sourceId] === undefined)
            ci[sourceId] = {};
        let sci = ci[sourceId];
        if (sci[resourceName] === undefined)
            sci[resourceName] = 0;
        sci[resourceName] += 1;
    }
    getDeliveryIntent(destinationId: string, resourceName: string): number {
        if (this.deliveryIntent === undefined) this.deliveryIntent = {};
        let di = this.deliveryIntent;
        if (di[destinationId] === undefined) di[destinationId] = {};
        let ddi = di[destinationId];
        if (ddi[resourceName] === undefined) ddi[resourceName] = 0;
        return ddi[resourceName];
    }
    getCollectionIntent(sourceId: string, resourceName: string): number {
        if (this.collectionIntent === undefined) this.collectionIntent = {};
        let ci = this.collectionIntent;
        if (ci[sourceId] === undefined) ci[sourceId] = {};
        let sci = ci[sourceId];
        if (sci[resourceName] === undefined) sci[resourceName] = 0;
        return sci[resourceName];
    }

    getTerrain(room: Room): number[][] {
        if (this.memory.terrainMap[room.name] === undefined) {
            let terrain = <LookAtResultWithPos[]>room.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 49, true);
            let result: number[][] = [];
            for (let r = 0; r < 50; ++r) {
                result.push([]);
                for (let c = 0; c < 50; ++c) {
                    result[r].push(-1)
                }
            }
            terrain.forEach(larwp => {
                if (larwp.terrain !== undefined) {
                    result[larwp.x][larwp.y] = mterrain.terrainStringToCode(larwp.terrain, this);
                }
            });
            for (let r = 0; r < 50; ++r) {
                for (let c = 0; c < 50; ++c) {
                    if (result[r][c] == -1)
                        throw new Error(`result[${r}][${c}] not set correctly.`);
                }
            }
            this.memory.terrainMap[room.name] = result;
        }
        return this.memory.terrainMap[room.name];
    }

    getTerrainWithStructures(room: Room): number[][] {
        let result = this.getTerrain(room).map((row) => row.map((col) => col));
        dictionary.forEach<StructureWrapper>(
            this.structureWrappers,
            (k, v) => {
                if (v.structure.room.name == room.name)
                    result[v.structure.pos.x][v.structure.pos.y] =
                        mstructure.structureTypeToCode(v.structure.structureType, this)
            }
        );
        return result;
    }

    getStructureCode(structureType: string): number {
        return mstructure.structureTypeToCode(structureType, this);
    }

    getPlannedConstructionSites(roomName: string): PlannedConstructionSite[] {
        if (this.memory.plannedConstructionSites[roomName] === undefined) {
            this.memory.plannedConstructionSites[roomName] = [];
        }
        return this.memory.plannedConstructionSites[roomName];
    }

    constructNextSite(room: Room): void {
        if (this.getConstructionSitesFromRoom(room).length > 0) return;
        let plan = this.getPlannedConstructionSites(room.name);
        let tws = this.getTerrainWithStructures(room);
        let eligiblePlans = plan.filter(pcs => { return pcs.roomName == room.name && isEligibleCodeForBuilding(tws[pcs.x][pcs.y], this); })
        if (eligiblePlans.length == 0) return;
        let bestPcsO = o.maxBy<PlannedConstructionSite>(
            eligiblePlans,
            (pcs: PlannedConstructionSite) => getPlannedConstructionSitePriority(pcs.structureType, this)
        );
        if (bestPcsO.isPresent) {
            let bestPcs = bestPcsO.get.elem;
            room.createConstructionSite(bestPcs.x, bestPcs.y, bestPcs.structureType);
        }
    }

    getTowerMemory(towerId: string): TowerMemory {
        if (this.memory.towerMemory[towerId] === undefined) {
            this.memory.towerMemory[towerId] = {
                status: "free",
                target: ""
            };
        }
        return this.memory.towerMemory[towerId];
    }

    setTowerMemory(towerId: string, towerMemory: TowerMemory): void {
        this.memory.towerMemory[towerId] = towerMemory;
    }

    getWallHitPoints(room: Room): number {
        if (this.memory.wallHitPoints[room.name] === undefined) {
            this.memory.wallHitPoints[room.name] = 1000;
        }
        return this.memory.wallHitPoints[room.name];
    }

    setWallHitPoints(room: Room, hitPoints: number): void {
        this.memory.wallHitPoints[room.name] = hitPoints;
    }

    getUid(): number {
        if (this.memory.uid === undefined) {
            this.memory.uid = this.game.time;
        }
        return ++(this.memory.uid);
    }

    moveCreep(cw: CreepWrapper, pos: RoomPosition): boolean {
        return cw.creep.moveTo(pos) == OK;
    }

    makeCreepWrapper(c: Creep): CreepWrapper {
        if (!c.my)
            return new mMiscCreep.MiscCreepWrapper(c, this.CREEP_TYPE_FOREIGNER);
        switch ((<CreepMemory>c.memory).creepType) {
            case this.CREEP_TYPE_BUILDER:
                return new mbuilder.BuilderCreepWrapper(c, this);
            case this.CREEP_TYPE_HARVESTER:
                return new mharvester.HarvesterCreepWrapper(c, this);
            case this.CREEP_TYPE_TRANSPORTER:
                return new mtransporter.TransporterCreepWrapper(c, this);
            case this.CREEP_TYPE_UPGRADER:
                return new mupgrader.UpgraderCreepWrapper(c, this);
            default:
                this.log.error(`makeCreepWrapper: creep ${c.name} of type ${(<CreepMemory>c.memory).creepType} not yet supported.`);
                return new mMiscCreep.MiscCreepWrapper(c, (<CreepMemory>c.memory).creepType);
        }
    }

    isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string): boolean {
        return mharvester.isHarvesterWithSource(creepWrapper, sourceId, this);
    }

    getTransporterEfficiency(room: Room): number {
        let ts = this.getMyCreeps().filter((cw) => cw.creepType == this.CREEP_TYPE_TRANSPORTER && cw.creep.room.name == room.name);
        let efficiencies = ts.map((cw) => this.getEfficiency(cw.creep.memory));
        if (efficiencies.length == 0)
            return 1;
        else
            return o.sum(efficiencies) / efficiencies.length;
    }

    pushEfficiency(memory: CreepMemory, efficiency: number): void {
        let maxSize = 50;
        let eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack)
        eq.push(efficiency);
        memory.totalEfficiency += efficiency;
        while (eq.length() > maxSize && maxSize >= 0) {
            memory.totalEfficiency -= eq.pop().get;
        }
    }

    getEfficiency(memory: CreepMemory): number {
        let eq = o.makeQueue(memory.efficiencies.pushStack, memory.efficiencies.popStack);
        if (eq.isEmpty()) return 0;
        else return memory.totalEfficiency / eq.length();
    }

}

function isEligibleCodeForBuilding(code: number, pv: Paraverse): boolean {
    return code == pv.TERRAIN_CODE_PLAIN || code == pv.TERRAIN_CODE_SWAMP;
}

function getPlannedConstructionSitePriority(structureType: string, pv: Paraverse): number {
    switch (structureType) {
        case STRUCTURE_TOWER: return 100;
        case STRUCTURE_WALL: return 99;
        case STRUCTURE_ROAD: return 98;
        default: return 0;
    }
}