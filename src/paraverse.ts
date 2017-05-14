import dictionary = require('./dictionary');
import mstructure = require('./structure');
import creep = require('./creep');
import source = require('./source');
import o = require('./option');
import mlogger = require('./logger');
import mroom = require('./room');
import mterrain = require('./terrain');

interface ParaMemory extends Memory {
    logLevel: number;
    creepOrders: Dictionary<PQEntry<CreepOrder>[]>;
    terrainMap: Dictionary<number[][]>;
    terrainStructureMap: Dictionary<number[][]>
    plannedConstructionSites: Dictionary<PlannedConstructionSite[]>;
    sourceMemories: Dictionary<SourceMemory>;
    uid: number;
}

export function makeParaverse(
    game: Game,
    map: GameMap,
    memory: Memory
): Paraverse {
    var paraMemory = <ParaMemory>memory;
    if (paraMemory.logLevel === undefined) paraMemory.logLevel = 2;
    if (paraMemory.creepOrders === undefined) paraMemory.creepOrders = {};
    if (paraMemory.terrainMap === undefined) paraMemory.terrainMap = {};
    if (paraMemory.terrainStructureMap === undefined) paraMemory.terrainStructureMap = {};
    if (paraMemory.plannedConstructionSites === undefined) paraMemory.plannedConstructionSites = {};
    if (paraMemory.sourceMemories === undefined) paraMemory.sourceMemories = {};
    if (paraMemory.uid === undefined) paraMemory.uid = game.time;
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

    LOG_LEVEL_SILENT: number;
    LOG_LEVEL_ERROR: number;
    LOG_LEVEL_WARN: number;
    LOG_LEVEL_INFO: number;
    LOG_LEVEL_DEBUG: number;

    CREEP_TYPE_BUILDER: string;
    CREEP_TYPE_HARVESTER: string;
    CREEP_TYPE_TRANSPORTER: string;
    CREEP_TYPE_UPGRADER: string;

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

    constructionSiteCache: Dictionary<ConstructionSite[]>;

    constructor(
        game: Game,
        map: GameMap,
        memory: ParaMemory
    ) {
        this.game = game;
        this.map = map;
        this.memory = memory;

        this.LOG_LEVEL_SILENT = 0;
        this.LOG_LEVEL_ERROR = 1;
        this.LOG_LEVEL_WARN = 2;
        this.LOG_LEVEL_INFO = 3;
        this.LOG_LEVEL_DEBUG = 4;

        this.CREEP_TYPE_BUILDER = "builder";
        this.CREEP_TYPE_HARVESTER = "harvester";
        this.CREEP_TYPE_TRANSPORTER = "transporter";
        this.CREEP_TYPE_UPGRADER = "upgrader";

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

        this.constructionSiteCache = {};

        this.roomWrappers = {};
        this.structureWrappers = {};
        this.creepWrappers = {};
        this.sourceWrappers = {};

        for (var roomName in Game.rooms) {
            var room = Game.rooms[roomName];
            room.find<Structure>(FIND_STRUCTURES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.structureWrappers[s.id] = mstructure.makeStructureWrapper(s, this); },
                        `Creating wrapper for ${s.structureType} ${s.id}`
                    );
                }
            );

            room.find<Creep>(FIND_CREEPS).forEach(
                (c) => {
                    o.tryCatch(
                        () => { this.creepWrappers[c.id] = creep.makeCreepWrapper(c, this); },
                        `Creating wrapper for creep ${c.name}`
                    );
                }
            );

            room.find<Source>(FIND_SOURCES).forEach(
                (s) => {
                    o.tryCatch(
                        () => { this.sourceWrappers[s.id] = source.makeSourceWrapper(s, this); },
                        `Creating wrapper for source ${s.id}`
                    );
                }
            );

            this.roomWrappers[room.name] = mroom.makeRoomWrapper(room);
        }

        this.log = mlogger.createLogger(memory.logLevel, this);
        this.bodyPartPriority = {};
        this.bodyPartPriority[MOVE] = 1;
        this.bodyPartPriority[HEAL] = 0;
        this.bodyPartPriority[WORK] = 3;
        this.bodyPartPriority[TOUGH] = 4;
        this.bodyPartPriority[ATTACK] = 2;
        this.bodyPartPriority[RANGED_ATTACK] = 2;
        this.bodyPartPriority[CARRY] = 3;
        this.bodyPartPriority[CLAIM] = 3;
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

    scheduleCreep(roomName: string, orderName: string, creepType: string, priority: number): void {
        // call getCreepOrders before looking at the raw entries
        let pq = this.getCreepOrders(roomName);
        if (this.memory.creepOrders[roomName].filter((pqe) => pqe.elem.orderName == orderName).length > 0) {
            return;
        } else {
            let creepOrder: CreepOrder = creep.makeCreepOrder(orderName, creepType, this);
            pq.push(creepOrder, Math.pow(2, priority) - this.game.time / 100.0);
            return;
        }
    }

    deprioritizeTopOrder(roomName: string, orderName: string, energyDeficit: number): void {
        let pq = this.getCreepOrders(roomName);
        let matchingOrders =
            this.memory.creepOrders[roomName].filter(
                (pqe) => pqe.elem.orderName == orderName
            ).forEach((pqe) => {
                pq.prioritize(pqe.index, pqe.priority - energyDeficit / 10.0 / 100.0);
            });
    }

    getTerrain(room: Room): number[][] {
        if (this.memory.terrainMap[room.name] === undefined) {
            let terrain = room.lookForAtArea(LOOK_TERRAIN, 0, 0, 49, 49);
            let result: number[][] = [];
            for (let r = 0; r < 50; ++r) {
                result.push([]);
                for (let c = 0; c < 50; ++c) {
                    result[r].push(mterrain.terrainStringToCode(terrain[r][c].terrain, this))
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
        if(bestPcsO.isPresent) {
            let bestPcs = bestPcsO.get.elem;
            room.createConstructionSite(bestPcs.x, bestPcs.y, bestPcs.structureType);
        }
    }

    getUid(): number {
        if (this.memory.uid === undefined) {
            this.memory.uid = this.game.time;
        }
        return ++(this.memory.uid);
    }

    isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string): boolean {
        return creep.isHarvesterWithSource(creepWrapper, sourceId, this);
    }

}

function isEligibleCodeForBuilding(code: number, pv: Paraverse): boolean {
    return code == pv.TERRAIN_CODE_PLAIN || code == pv.TERRAIN_CODE_SWAMP;
}

function getPlannedConstructionSitePriority(structureType: string, pv: Paraverse): number {
    switch(structureType) {
        case STRUCTURE_TOWER: return 100;
        case STRUCTURE_WALL: return 99;
        case STRUCTURE_ROAD: return 98;
        default: return 0;
    }
}