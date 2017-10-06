import dictionary = require('./dictionary');
import mstructure = require('./structure');
import mMiscCreep = require('./miscCreep');
import mtransporter = require('./transporter');
import mbuilder = require('./builder');
import mharvester = require('./harvester');
import mupgrader = require('./upgrader');
import mdefender = require('./defender');
import mclaimer = require('./claimer');
import source = require('./source');
import o = require('./option');
import mlogger = require('./logger');
import mroom = require('./room');
import mterrain = require('./terrain');
import mms = require('./mapSearch');

interface FatigueRecord {
    xy: XY;
    fatigue: number;
}

interface ParaMemory extends Memory {
    logCategories: Dictionary<boolean>;
    creepOrders: Dictionary<PQEntry<CreepOrder>[]>;
    terrainMap: Dictionary<number[][]>;
    sourceMemories: Dictionary<SourceMemory>;
    uid: number;
    towerMemory: Dictionary<TowerMemory>;
    wallHitPoints: Dictionary<number>;
    fatigueRecords: Dictionary<Dictionary<FatigueRecord>>;
    roomMemories: Dictionary<RoomMemory>;
    timerLogs: Dictionary<TimerLog>;
}

export function makeParaverse(
    game: Game,
    map: GameMap,
    memory: Memory
): Paraverse {
    var paraMemory = <ParaMemory>memory;
    if (paraMemory.logCategories === undefined) paraMemory.logCategories = {};
    if (paraMemory.creepOrders === undefined) paraMemory.creepOrders = {};
    if (paraMemory.terrainMap === undefined) paraMemory.terrainMap = {};
    if (paraMemory.sourceMemories === undefined) paraMemory.sourceMemories = {};
    if (paraMemory.uid === undefined) paraMemory.uid = game.time;
    if (paraMemory.towerMemory === undefined) paraMemory.towerMemory = {};
    if (paraMemory.wallHitPoints === undefined) paraMemory.wallHitPoints = {};
    if (paraMemory.fatigueRecords === undefined) paraMemory.fatigueRecords = {};
    if (paraMemory.timerLogs === undefined) paraMemory.timerLogs = {};

    return new ParaverseImpl(game, map, paraMemory);
}

class ParaverseImpl implements Paraverse {
    game: Game;
    map: GameMap;
    memory: ParaMemory;

    logger: Logger;

    bodyPartPriority: Dictionary<number>;

    roomWrappers: Dictionary<RoomWrapper>;
    structureWrappers: StructureWrapper[];
    creepWrappers: CreepWrapper[];
    sourceWrappers: SourceWrapper[];


    constructionSitesByRoom: Dictionary<ConstructionSite[]>;
    constructionSitesByRoomAndType: Dictionary<Dictionary<ConstructionSite[]>>;
    possibleConstructionSitesCache: Dictionary<boolean[][]>;
    possibleMoveSitesCache: Dictionary<boolean[][]>;
    possibleCollectionSitesCache: Dictionary<boolean[][]>;

    hostileStructuresByRoom: Dictionary<Structure[]>;
    hostileCreepsByRoom: Dictionary<Creep[]>;

    myStructures: StructureWrapper[];
    myStructuresByRoom: Dictionary<StructureWrapper[]>;
    myStructuresByRoomAndType: Dictionary<Dictionary<StructureWrapper[]>>;
    structuresById: Dictionary<StructureWrapper>;

    myCreepWrappers: CreepWrapper[];
    myCreepWrappersByRoom: Dictionary<CreepWrapper[]>;
    myCreepWrappersByRoomAndType: Dictionary<Dictionary<CreepWrapper[]>>;
    creepsById: Dictionary<CreepWrapper>;

    myFlags: Flag[];
    myFlagsByRoom: Dictionary<Flag[]>;
    myFlagsByRoomAndColors: Dictionary<Dictionary<Dictionary<Flag[]>>>;


    deliveryIntent: Dictionary<Dictionary<number>>;
    collectionIntent: Dictionary<Dictionary<number>>;

    collectedDefense: Dictionary<number>;

    startTimes: Dictionary<number>;

    LOG_LEVEL_SILENT: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARN: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;

    CREEP_TYPE_BUILDER: string;
    CREEP_TYPE_DEFENDER: string;
    CREEP_TYPE_HARVESTER: string;
    CREEP_TYPE_TRANSPORTER: string;
    CREEP_TYPE_UPGRADER: string;
    CREEP_TYPE_FOREIGNER: string;
    CREEP_TYPE_CLAIMER: string;

    TERRAIN_CODE_PLAIN: number;
    TERRAIN_CODE_SWAMP: number;
    TERRAIN_CODE_WALL: number;
    TERRAIN_CODE_LAVA: number;
    TERRAIN_CODE_STRUCTURE: number;
    TERRAIN_CODE_SOURCE: number;
    TERRAIN_CODE_CREEP: number;
    TERRAIN_CODE_CONSTRUCTION_SITE: number;

    DELIVERY_AMOUNT: number;

    PUSH_REQUEST: number;
    PULL_REQUEST: number;

    constructor(
        game: Game,
        map: GameMap,
        memory: ParaMemory
    ) {
        this.game = game;
        this.map = map;
        this.memory = memory;
        this.logger = mlogger.createLogger(memory.logCategories);

        this.LOG_LEVEL_SILENT = 0;
        this.LOG_LEVEL_ERROR = 1;
        this.LOG_LEVEL_WARN = 2;
        this.LOG_LEVEL_INFO = 3;
        this.LOG_LEVEL_DEBUG = 4;

        this.CREEP_TYPE_BUILDER = "builder";
        this.CREEP_TYPE_DEFENDER = "defender";
        this.CREEP_TYPE_HARVESTER = "harvester";
        this.CREEP_TYPE_TRANSPORTER = "transporter";
        this.CREEP_TYPE_UPGRADER = "upgrader";
        this.CREEP_TYPE_FOREIGNER = "foreigner";
        this.CREEP_TYPE_CLAIMER = "claimer";

        this.TERRAIN_CODE_PLAIN = 0;
        this.TERRAIN_CODE_SWAMP = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_WALL = TERRAIN_MASK_WALL;
        this.TERRAIN_CODE_LAVA = TERRAIN_MASK_SWAMP;
        this.TERRAIN_CODE_STRUCTURE = 8;
        this.TERRAIN_CODE_SOURCE = 16
        this.TERRAIN_CODE_CREEP = 32
        this.TERRAIN_CODE_CONSTRUCTION_SITE = 64;

        this.DELIVERY_AMOUNT = 150;

        this.PUSH_REQUEST = 0;
        this.PULL_REQUEST = 1;

        this.deliveryIntent = {};
        this.collectionIntent = {};


        this.bodyPartPriority = {};
        this.bodyPartPriority[MOVE] = 3;
        this.bodyPartPriority[HEAL] = 4;
        this.bodyPartPriority[WORK] = 1;
        this.bodyPartPriority[TOUGH] = 0;
        this.bodyPartPriority[ATTACK] = 2;
        this.bodyPartPriority[RANGED_ATTACK] = 2;
        this.bodyPartPriority[CARRY] = 1;
        this.bodyPartPriority[CLAIM] = 1;

        this.constructionSitesByRoom = {};
        this.constructionSitesByRoomAndType = {};
        this.possibleConstructionSitesCache = {};
        this.possibleMoveSitesCache = {};
        this.possibleCollectionSitesCache = {};
        this.collectedDefense = {};


        this.roomWrappers = {};
        this.structureWrappers = [];
        this.creepWrappers = [];
        this.sourceWrappers = [];

        let pv = this;
        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            room.find<Structure>(FIND_STRUCTURES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.structureWrappers.push(mstructure.makeStructureWrapper(s, pv)); },
                        `Creating wrapper for ${s.structureType} ${s.id}`
                    );
                }
            );

            room.find<Creep>(FIND_CREEPS).forEach(
                (c) => {
                    o.tryCatch(
                        () => { this.creepWrappers.push(pv.makeCreepWrapper(c)); },
                        `Creating wrapper for creep ${c.name}`
                    );
                }
            );

            room.find<Source>(FIND_SOURCES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.sourceWrappers.push(source.makeSourceWrapper(s, pv)); },
                        `Creating wrapper for source ${s.id}`
                    );
                }
            );

            this.roomWrappers[room.name] = mroom.makeRoomWrapper(room);
        }

        //delete memory of dead crees
        for (let creepName in this.memory.creeps) {
            if (this.game.creeps[creepName] === undefined) {
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

        this.myCreepWrappers = this.creepWrappers.filter(cw => cw.element.my);
        this.hostileStructuresByRoom =
            dictionary.arrayToDictionary<Structure>(
                this.structureWrappers.filter(
                    sw => !sw.my
                ).map(
                    sw => sw.element
                    ).filter(
                    hs =>
                        (hs.structureType != STRUCTURE_CONTROLLER
                            && hs.structureType != STRUCTURE_PORTAL
                            && hs.structureType != STRUCTURE_KEEPER_LAIR
                            && hs.structureType != STRUCTURE_POWER_BANK)),
                (s: Structure) => s.room.name
            );
        this.myCreepWrappersByRoom =
            dictionary.arrayToDictionary<CreepWrapper>(
                this.myCreepWrappers,
                (cw: CreepWrapper) => cw.element.room.name
            );
        this.myCreepWrappersByRoomAndType =
            dictionary.mapValues<CreepWrapper[], Dictionary<CreepWrapper[]>>(
                this.myCreepWrappersByRoom,
                (cwa: CreepWrapper[]) => dictionary.arrayToDictionary(
                    cwa,
                    (cw: CreepWrapper) => cw.creepType
                )
            );
        this.hostileCreepsByRoom =
            dictionary.arrayToDictionary<Creep>(
                this.creepWrappers.filter(cw => !cw.element.my).map(cw => cw.element),
                (c: Creep) => c.room.name
            );

        this.myStructures = this.structureWrappers.filter(sw => sw.my);
        this.myStructuresByRoom =
            dictionary.arrayToDictionary<StructureWrapper>(
                this.myStructures,
                (sw: StructureWrapper) => sw.element.room.name
            );
        this.myStructuresByRoomAndType =
            dictionary.mapValues<StructureWrapper[], Dictionary<StructureWrapper[]>>(
                this.myStructuresByRoom,
                (rsw: StructureWrapper[]) => dictionary.arrayToDictionary<StructureWrapper>(
                    rsw,
                    (sw: StructureWrapper) => sw.element.structureType
                )
            );

        let fatigueRecords = this.memory.fatigueRecords;
        for (let rn in fatigueRecords) {
            for (let frk in fatigueRecords[rn]) {
                fatigueRecords[rn][frk].fatigue -= 1.0;
                if (fatigueRecords[rn][frk].fatigue < 0)
                    delete fatigueRecords[rn][frk];
            }
        }

        this.structuresById = {};
        for (let swi = 0; swi < this.structureWrappers.length; ++swi) {
            let sw = this.structureWrappers[swi];
            this.structuresById[sw.element.id] = sw;
        }

        this.creepsById = {};
        for (let cwi = 0; cwi < this.creepWrappers.length; ++cwi) {
            let cw = this.creepWrappers[cwi];
            this.creepsById[cw.element.id] = cw;
        }

        this.myFlags = dictionary.getValues(this.game.flags);
        this.myFlagsByRoom = dictionary.arrayToDictionary<Flag>(this.myFlags, (flag: Flag) => flag.pos.roomName);
        this.myFlagsByRoomAndColors = dictionary.mapValues<Flag[], Dictionary<Dictionary<Flag[]>>>(
            this.myFlagsByRoom,
            (roomFlags: Flag[]) => dictionary.mapValues<Flag[], Dictionary<Flag[]>>(
                dictionary.arrayToDictionary<Flag>(roomFlags, (flag: Flag) => flag.color.toString()),
                (roomColorFlags: Flag[]) => dictionary.arrayToDictionary<Flag>(roomColorFlags, (flag: Flag) => flag.secondaryColor.toString())
            )
        );

        this.startTimes = {};
    }

    getMyRooms(): RoomWrapper[] {
        return dictionary.getValues<RoomWrapper>(this.roomWrappers).filter(rw => (rw.room.controller === undefined) ? false : rw.room.controller.my);
    }

    getMyCreeps(): CreepWrapper[] {
        if (this.myCreepWrappers === undefined || this.myCreepWrappers == null) {
            this.myCreepWrappers = this.creepWrappers.filter(cw => cw.element.my);
        }
        return this.myCreepWrappers;
    }

    getMyCreepsByRoom(room: Room): CreepWrapper[] {
        if (this.myCreepWrappersByRoom === undefined) {
            this.myCreepWrappersByRoom = {}
        }
        let mcwbr = this.myCreepWrappersByRoom;
        if (mcwbr[room.name] === undefined) {
            mcwbr[room.name] = this.getMyCreeps().filter(cw => cw.element.room.name == room.name);
        }
        return mcwbr[room.name];
    }

    getMyCreepsByRoomAndType(room: Room, creepType: string): CreepWrapper[] {
        if (this.myCreepWrappersByRoomAndType === undefined) {
            this.myCreepWrappersByRoomAndType = {};
        }
        let mcwbrat = this.myCreepWrappersByRoomAndType;
        if (mcwbrat[room.name] === undefined) {
            mcwbrat[room.name] = {};
        }
        let mcwbt = mcwbrat[room.name];
        if (mcwbt[creepType] === undefined) {
            mcwbt[creepType] = this.getMyCreepsByRoom(room).filter(cw => cw.creepType == creepType);
        }
        return mcwbt[creepType];
    }

    getCreepById(id: string): Option<CreepWrapper> {
        if (this.creepsById[id] === undefined)
            return o.None<CreepWrapper>();
        else
            return o.Some<CreepWrapper>(this.creepsById[id]);
    }

    getMyStructures(): StructureWrapper[] {
        return this.myStructures;
    }

    getMyStructuresByRoom(room: Room): StructureWrapper[] {
        if (this.myStructuresByRoom[room.name] === undefined) {
            this.myStructuresByRoom[room.name] = [];
        }
        return this.myStructuresByRoom[room.name];
    }

    getMyStructuresByRoomAndType(room: Room, structureType: string): StructureWrapper[] {
        if (this.myStructuresByRoomAndType[room.name] === undefined)
            this.myStructuresByRoomAndType[room.name] = {};
        let msbt = this.myStructuresByRoomAndType[room.name];
        if (msbt[structureType] === undefined)
            msbt[structureType] = [];
        return msbt[structureType];
    }

    getStructureById(id: string): Option<StructureWrapper> {
        if (this.structuresById[id] === undefined)
            return o.None<StructureWrapper>();
        else
            return o.Some<StructureWrapper>(this.structuresById[id]);
    }

    getRequestorById(id: string): Option<ResourceRequestor> {
        let creep = this.getCreepById(id);
        if (creep.isPresent)
            return creep;
        else
            return this.getStructureById(id);
    }

    getMyFlags(): Flag[] {
        return this.myFlags;
    }

    getMyFlagsByRoom(room: Room): Flag[] {
        return dictionary.getOrElse(this.myFlagsByRoom, room.name, []);
    }

    getMyFlagsByRoomAndColors(room: Room, color: number, secondaryColor: number): Flag[] {
        return dictionary.getOrElse(
            dictionary.getOrElse(
                dictionary.getOrElse(
                    this.myFlagsByRoomAndColors,
                    room.name,
                    {}
                ),
                color.toString(),
                {}
            ),
            secondaryColor.toString(),
            []
        );
    }

    manageResources(room: Room): void {
        mtransporter.manageResourcesForRoom(room, this);
    }

    getRoomMemory(room: Room): RoomMemory {
        if (this.memory.roomMemories === undefined)
            this.memory.roomMemories = {};
        let roomMemory = dictionary.getOrAdd<RoomMemory>(
            this.memory.roomMemories, room.name,
            {
                queuedResourceRequests: [],
                roomsToClaim: [],
                roomsToMine: [],
                roomsToSign: []
            });
        if (roomMemory.roomsToClaim === undefined) roomMemory.roomsToClaim = [];
        if (roomMemory.roomsToMine === undefined) roomMemory.roomsToMine = [];
        if (roomMemory.roomsToSign === undefined) roomMemory.roomsToSign = [];
        return roomMemory;
    }

    getSpawnMemory(spawn: StructureSpawn): SpawnMemory {
        let mem = <SpawnMemory>spawn.memory;
        if (mem.lastTickEnergy === undefined) mem.lastTickEnergy = 0;
        if (mem.ticksSinceLastDonation === undefined) mem.ticksSinceLastDonation = 1;
        return mem;
    }

    getMySources(): SourceWrapper[] {
        return this.sourceWrappers.filter(sw => sw.source.room.controller === undefined ? false : sw.source.room.controller.my);
    }

    getSourceMemory(s: Source): SourceMemory {
        if (this.memory.sourceMemories[s.id] === undefined) {
            this.memory.sourceMemories[s.id] = source.makeSourceMemory(s, this);
        }
        return this.memory.sourceMemories[s.id];
    }

    getHostileCreepsInRoom(room: Room): Creep[] {
        if (this.hostileCreepsByRoom === undefined || this.hostileCreepsByRoom == null)
            this.hostileCreepsByRoom = {};
        let hcbr = this.hostileCreepsByRoom;
        if (hcbr[room.name] === undefined) {
            hcbr[room.name] = [];
        }
        return hcbr[room.name];
    }

    getHostileStructuresInRoom(room: Room): Structure[] {
        if (this.hostileStructuresByRoom === undefined || this.hostileStructuresByRoom == null)
            this.hostileStructuresByRoom = {};
        let hsbr = this.hostileStructuresByRoom;
        if (hsbr[room.name] === undefined) {
            hsbr[room.name] = [];
        }
        return hsbr[room.name];
    }

    getCreepOrders(roomName: string): PQ<CreepOrder> {
        if (this.memory.creepOrders[roomName] === undefined) {
            this.memory.creepOrders[roomName] = [];
        }
        return o.wrapPriorityQueueData<CreepOrder>(this.memory.creepOrders[roomName]);
    }

    getConstructionSitesFromRoom(room: Room): ConstructionSite[] {
        if (this.constructionSitesByRoom[room.name] === undefined) {
            this.constructionSitesByRoom[room.name] = room.find<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);
            this.constructionSitesByRoomAndType[room.name] =
                dictionary.arrayToDictionary<ConstructionSite>(
                    this.constructionSitesByRoom[room.name],
                    (cs: ConstructionSite) => cs.structureType
                );
        }
        return this.constructionSitesByRoom[room.name];
    }

    getConstructionSitesFromRoomOfType(room: Room, structureType: string): ConstructionSite[] {
        this.getConstructionSitesFromRoom(room);
        let csbt = this.constructionSitesByRoomAndType[room.name];
        if (csbt[structureType] === undefined) csbt[structureType] = [];
        return csbt[structureType];
    }

    scheduleCreep(room: Room, order: CreepOrder, priority: number): void {
        // call getCreepOrders before looking at the raw entries
        let pq = this.getCreepOrders(room.name);
        let alreadySpawning =
            this.getMyStructuresByRoomAndType(room, STRUCTURE_SPAWN).filter(sw => {
                let spawning = (<StructureSpawn>sw.element).spawning;
                return spawning != null;
            }).length > 0;
        let alreadySpawningOrScheduled =
            alreadySpawning || this.memory.creepOrders[room.name].filter(
                (pqe) => pqe.elem.orderName == order.orderName
            ).length > 0;
        if (alreadySpawningOrScheduled) {
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
    makeDefenderOrder(orderName: string, targetId: string): CreepOrder { return mdefender.makeDefenderOrder(orderName, targetId, this); }
    makeClaimerOrder(orderName: string, destination: string, destinationPath: string[], addClaimPart: boolean): CreepOrder { return mclaimer.makeClaimerOrder(orderName, destination, destinationPath, addClaimPart, this); }

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

    getPossibleMoveSites(room: Room): boolean[][] {
        if (this.possibleMoveSitesCache === undefined) this.possibleMoveSitesCache = {};
        if (this.possibleMoveSitesCache[room.name] === undefined) {
            let result: boolean[][] = this.getTerrain(room).map((row) => row.map((col) => col == this.TERRAIN_CODE_PLAIN || col == this.TERRAIN_CODE_SWAMP));
            this.structureWrappers.forEach(
                sw => {
                    if (sw.element.room.name == room.name && this.isMovementBlocking(sw.element.structureType))
                        result[sw.element.pos.x][sw.element.pos.y] = false;
                }
            );
            this.getMySources().forEach(sw => { result[sw.source.pos.x][sw.source.pos.y] = false; });
            this.getMyCreepsByRoom(room).forEach(cw => { result[cw.element.pos.x][cw.element.pos.y] = false; });
            this.getHostileCreepsInRoom(room).forEach(creep => { if (creep.room.name == room.name) result[creep.pos.x][creep.pos.y] = false; });
            this.possibleMoveSitesCache[room.name] = result;
        }
        return this.possibleMoveSitesCache[room.name];
    }

    getPossibleCollectionSites(room: Room): boolean[][] {
        if (this.possibleCollectionSitesCache === undefined) this.possibleCollectionSitesCache = {};
        if (this.possibleCollectionSitesCache[room.name] === undefined) {
            let result: boolean[][] = this.getTerrain(room).map((row) => row.map((col) => col == this.TERRAIN_CODE_PLAIN || col == this.TERRAIN_CODE_SWAMP));
            this.structureWrappers.forEach(
                sw => {
                    if (sw.element.room.name == room.name && this.isMovementBlocking(sw.element.structureType))
                        result[sw.element.pos.x][sw.element.pos.y] = false;
                }
            );
            this.getMySources().forEach(sw => { result[sw.source.pos.x][sw.source.pos.y] = false; });
            this.possibleCollectionSitesCache[room.name] = result;
        }
        return this.possibleCollectionSitesCache[room.name];
    }

    isMovementBlocking(structureType: string): boolean {
        switch (structureType) {
            case STRUCTURE_RAMPART:
            case STRUCTURE_CONTAINER:
            case STRUCTURE_ROAD:
                return false;
            default:
                return true;
        }
    }

    getPossibleConstructionSites(room: Room): boolean[][] {
        if (this.possibleConstructionSitesCache === undefined) this.possibleConstructionSitesCache = {};
        if (this.possibleConstructionSitesCache[room.name] === undefined) {
            let result: boolean[][] = this.getTerrain(room).map((row) => row.map((col) => col == this.TERRAIN_CODE_PLAIN || col == this.TERRAIN_CODE_SWAMP));
            this.getConstructionSitesFromRoom(room).forEach(cs => result[cs.pos.x][cs.pos.y] = false);
            this.structureWrappers.forEach(sw => { if (sw.element.room.name == room.name && sw.element.structureType != STRUCTURE_ROAD) result[sw.element.pos.x][sw.element.pos.y] = false; });
            this.getMySources().forEach(sw => { if (sw.source.room.name == room.name) result[sw.source.pos.x][sw.source.pos.y] = false; });
            this.possibleConstructionSitesCache[room.name] = result;
        }
        return this.possibleConstructionSitesCache[room.name].map(row => row.map(cell => cell));
    }

    blackoutMap(map: boolean[][], pos: RoomPosition, range: number) {
        for (let x1 = Math.max(0, pos.x - range); x1 < Math.min(pos.x + range + 1, map.length); ++x1) {
            for (let y1 = Math.max(0, pos.y - range); y1 < Math.min(pos.y + range + 1, map[x1].length); ++y1) {
                map[x1][y1] = false;
            }
        }
    }

    constructNextSite(room: Room, structureType: string): boolean {
        let possibleConstructionSites = this.getPossibleConstructionSites(room);
        this.getMyStructuresByRoomAndType(room, STRUCTURE_CONTROLLER).forEach(sw => { this.blackoutMap(possibleConstructionSites, sw.element.pos, 3); });
        this.getMySources().forEach(sw => { if (sw.source.room.name == room.name) this.blackoutMap(possibleConstructionSites, sw.source.pos, 3); });
        let optXy = mms.searchForConstructionSite(possibleConstructionSites);
        if (optXy.isPresent)
            return room.createConstructionSite(optXy.get.x, optXy.get.y, structureType) == OK;
        else
            return false;
    }

    constructNextContainer(source: Source): boolean {
        let possibleConstructionSites = this.getPossibleConstructionSites(source.room);
        let optXy = mms.searchForContainerConstructionSite(possibleConstructionSites, source.pos.x, source.pos.y);
        if (optXy.isPresent) {
            this.log(["paraverse", "constructNextContainer"], () => `Creating container at ${source.room.name}[${optXy.get.x}][${optXy.get.y}].`);
            return source.room.createConstructionSite(optXy.get.x, optXy.get.y, STRUCTURE_CONTAINER) == OK;
        } else {
            this.log(["paraverse", "warning", "constructNextContainer"], () => `Failed to create container for source ${source.id} in room ${source.room.name}`);
            return false;
        }
    }

    constructNextStorage(room: Room): boolean {
        let possibleConstructionSites = this.getPossibleConstructionSites(room);
        this.getMySources().forEach(sw => { if (sw.source.room.name == room.name) this.blackoutMap(possibleConstructionSites, sw.source.pos, 3); });
        let optXy = mms.searchForStorageConstructionSite(possibleConstructionSites, room.controller.pos.x, room.controller.pos.y);
        if (optXy.isPresent) {
            this.log(["paraverse", "constructNextStorage"], () => `Creating storage at ${room.name}[${optXy.get.x}][${optXy.get.y}].`);
            return room.createConstructionSite(optXy.get.x, optXy.get.y, STRUCTURE_STORAGE) == OK;
        } else {
            this.log(["paraverse", "warning", "constructNextStorage"], () => `Failed to create storage for room ${room.name}.`);
            return false;
        }
    }

    isCloseToLair(source: Source, sourceMemory: SourceMemory): boolean {
        if (sourceMemory.isCloseToLair === undefined)
            sourceMemory.isCloseToLair = source.pos.findInRange<Structure>(
                FIND_STRUCTURES, 10
            ).filter(
                (s: Structure) => s.structureType == STRUCTURE_KEEPER_LAIR
                ).length > 0;
        return sourceMemory.isCloseToLair;
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
        if (cw.element.fatigue > 0 && this.getPossibleConstructionSites(cw.element.room)[cw.element.pos.x][cw.element.pos.y])
            this.recordFatigue(
                cw.element.pos.x,
                cw.element.pos.y,
                cw.element.pos.roomName);
        let isStuck = false;
        if (cw.element.fatigue == 0) {
            if (cw.element.pos.x == cw.memory.lastX && cw.element.pos.y == cw.memory.lastY) {
                ++cw.memory.lastTimeOfMoveAttempt;
            } else {
                cw.memory.lastX = cw.element.pos.x;
                cw.memory.lastY = cw.element.pos.y;
                cw.memory.lastTimeOfMoveAttempt = 0;
            }
            if (cw.memory.lastTimeOfMoveAttempt >= 3)
                isStuck = true;
        }
        return cw.element.moveTo(pos, { reusePath: isStuck ? 0 : 50, ignoreCreeps: !isStuck }) == OK;
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
            case this.CREEP_TYPE_DEFENDER:
                return new mdefender.DefenderCreepWrapper(c, this);
            case this.CREEP_TYPE_CLAIMER:
                return new mclaimer.ClaimerCreepWrapper(c, this);
            default:
                this.log(["error", "paraverse", "makeCreepWrapper"], () => `makeCreepWrapper: creep ${c.name} of type ${(<CreepMemory>c.memory).creepType} not yet supported.`);
                return new mMiscCreep.MiscCreepWrapper(c, (<CreepMemory>c.memory).creepType);
        }
    }

    isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string): boolean {
        return mharvester.isHarvesterWithSource(creepWrapper, sourceId, this);
    }

    getTransporterEfficiency(room: Room): number {
        let ts = this.getMyCreepsByRoomAndType(room, this.CREEP_TYPE_TRANSPORTER);
        let efficiencies = ts.map((cw) => this.getEfficiency(cw.element.memory));
        if (efficiencies.length == 0)
            return 1;
        else
            return o.sum(efficiencies) / efficiencies.length;
    }

    pushEfficiency(memory: CreepMemory, efficiency: number): void {
        let maxSize = 200;
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

    avoidObstacle(cw: CreepWrapper): void {
        let creep = cw.element;
        let possibleMoveSites = this.getPossibleMoveSites(creep.room);
        let validMoves: XY[] = [];
        let checkForObstacle = function (dx: number, dy: number, pv: Paraverse): boolean {
            let x = creep.pos.x + dx;
            let y = creep.pos.y + dy;
            if (x < 0 || x > 49 || y < 0 || y > 49) return true;
            if (!possibleMoveSites[x][y]) {
                return true;
            }
            validMoves.push({ x: x, y: y });
            return false;
        };
        let downObs = checkForObstacle(0, 1, this);
        let leftObs = checkForObstacle(-1, 0, this);
        let rightObs = checkForObstacle(1, 0, this);
        let upObs = checkForObstacle(0, -1, this);

        checkForObstacle(-1, -1, this);
        checkForObstacle(-1, 1, this);
        checkForObstacle(1, -1, this);
        checkForObstacle(1, 1, this);
        let nextToObstacle: boolean = upObs || downObs || leftObs || rightObs;

        if (nextToObstacle && validMoves.length > 0) {
            let randomValidMove = validMoves[(Math.floor(Math.random() * validMoves.length) + this.game.time) % validMoves.length];
            let newPos = creep.room.getPositionAt(randomValidMove.x, randomValidMove.y);
            this.moveCreep(cw, newPos);
        }
    }

    recordDefense(soldier: Creep, enemyId: string): void {
        if (this.collectedDefense === undefined) this.collectedDefense = {};
        let collectedDefense = this.collectedDefense;
        if (collectedDefense[enemyId] === undefined) collectedDefense[enemyId] = 0;
        collectedDefense[enemyId] += this.getSoldierCapability(soldier);
    }

    getTotalCollectedDefense(enemyId: string): number {
        if (this.collectedDefense === undefined) this.collectedDefense = {};
        let collectedDefense = this.collectedDefense;
        if (collectedDefense[enemyId] === undefined) collectedDefense[enemyId] = 0;
        return collectedDefense[enemyId];
    }

    getSoldierCapability(soldier: Creep): number {
        return (
            soldier.getActiveBodyparts(RANGED_ATTACK) * RANGED_ATTACK_POWER
            // + soldier.getActiveBodyparts(ATTACK) * ATTACK_POWER
            + soldier.getActiveBodyparts(HEAL) * HEAL_POWER
        );
    }

    resourceAmount(storage: Dictionary<number>, resourceType: string): number {
        if (storage[resourceType] === undefined)
            return 0;
        else
            return storage[resourceType];
    }

    availableSpace(storage: Dictionary<number>, capacity: number): number {
        let fullness = 0;
        for (let rt in storage) fullness += storage[rt];
        return capacity - fullness;
    }

    recordFatigue(x: number, y: number, roomName: string) {
        let key = `${x}_${y}`;
        let roomFr = dictionary.getOrAdd<Dictionary<FatigueRecord>>(this.memory.fatigueRecords, roomName, {});
        dictionary.getOrAdd<FatigueRecord>(roomFr, key, { xy: { x: x, y: y }, fatigue: 0 });
        roomFr[key].fatigue += 20;
    }

    mustBuildRoad(room: Room): boolean {
        let roomfr = dictionary.getOrElse(this.memory.fatigueRecords, room.name, {});

        //delete fatigue records on places which already have construction
        let cs = this.getPossibleConstructionSites(room);
        for (let frk in roomfr) {
            let frxy = roomfr[frk].xy
            if (!cs[frxy.x][frxy.y])
                delete roomfr[frk];
        }

        for (let frk in roomfr) {
            if (roomfr[frk].fatigue > 1000)
                return true;
        }
        return false;
    }

    getRoadToBeBuilt(room: Room): XY {
        let roomFrs = this.memory.fatigueRecords[room.name];
        let maxFFr = o.maxBy(dictionary.getValues(roomFrs), (fr: FatigueRecord) => fr.fatigue);
        return maxFFr.get.elem.xy;
    }

    euclidean(p1: RoomPosition, p2: RoomPosition): number {
        return mterrain.euclidean(p1, p2, this);
    }

    manhattan(p1: RoomPosition, p2: RoomPosition): number {
        return mterrain.manhattan(p1, p2, this);
    }

    log(categories: string[], message: (() => string)): void {
        this.logger.log(categories, message);
    }

    startTimer(label: string): void {
        this.startTimer[label] = this.game.cpu.getUsed();
    }

    endTimer(label: string): void {
        let start = dictionary.getOrElse<number>(this.startTimes, label, 0);
        let delta = this.game.cpu.getUsed() - start;
        let timeLog = dictionary.getOrAdd<TimerLog>(
            this.memory.timerLogs,
            label,
            {
                totalTime: 0,
                count: 0,
                totalTimeSq: 0
            });
        ++timeLog.count;
        timeLog.totalTime += delta;
        timeLog.totalTimeSq += delta * delta;
    }

    printTimings(): void {
        for (let label in this.memory.timerLogs) {
            let log = this.memory.timerLogs[label];
            let avg = log.totalTime / log.count;
            let std = Math.sqrt((log.totalTimeSq / log.count) - avg * avg);
            console.log(`${label}\t: ${Math.round(avg * 100000) / 100000} \t+- ${Math.round(std * 300000) / 100000}`);
        }
    }

}