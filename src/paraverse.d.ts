declare interface Paraverse {
    game: Game;
    memory: Memory;
    map: GameMap;

    log: Logger;
    setLogLevel(level: number): void;

    bodyPartPriority: Dictionary<number>;

    getMyRooms(): RoomWrapper[];
    getMyStructures(): StructureWrapper[];
    getMyCreeps(): CreepWrapper[];
    getMySources(): SourceWrapper[];
    getSourceMemory(source: Source): SourceMemory;

    getCreepOrders(roomName: string): PQ<CreepOrder>;
    scheduleCreep(roomName: string, order: CreepOrder, priority: number): void;
    removeCreepOrder(roomName: string, orderName: string): void;
    makeBuilderOrder(orderName: string): CreepOrder;
    makeHarvesterOrder(orderName: string, sourceId: string): CreepOrder;
    makeTransporterOrder(orderName: string): CreepOrder;
    makeUpgraderOrder(orderName: string, roomName: string): CreepOrder;

    requestResourceReceive(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void;
    requestResourceSend(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void;
    manageSupplyAndDemand(): void;

    getConstructionSitesFromRoom(room: Room): ConstructionSite[];
    getTerrain(room: Room): number[][];
    getTerrainWithStructures(room: Room): number[][];
    getStructureCode(structureType: string): number;
    getPlannedConstructionSites(roomName: string): PlannedConstructionSite[];

    constructNextSite(room: Room): void;

    moveCreep(cw: CreepWrapper, pos: RoomPosition): boolean;
    makeCreepWrapper(c: Creep): CreepWrapper;
    isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string): boolean;
    getTransporterEfficiency(room: Room): number;
    pushEfficiency(memory: CreepMemory, efficiency: number): void;
    getEfficiency(memory: CreepMemory): number;

    getUid(): number;

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
}

declare interface Logger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
    setLogLevel(logLevel: number): void;
}

declare interface StructureWrapper {
    structure: Structure;
    process(pv: Paraverse): void;
    my: boolean;
}

declare interface CreepWrapper {
    creep: Creep;
    creepType: string;
    process(pv: Paraverse): void;
}

declare interface SourceMemory {
    id: string;
}

declare interface SourceWrapper {
    source: Source;
    process(pv: Paraverse): void;
}

declare interface RoomWrapper {
    room: Room;
    process(pv: Paraverse): void;
}

declare interface CreepMemory {
    creepType: string;
    efficiencies: QueueData<number>;
    totalEfficiency: number;
}

declare interface CreepOrder {
    creepType: string;
    name: string;
    orderName: string;
    basicBody: string[];
    addOnBody: string[];
    maxEnergy: number;
    memory: CreepMemory;
}

declare interface PlannedConstructionSite {
    structureType: string;
    x: number;
    y: number;
    roomName: string;
}

declare interface XY{
    x: number;
    y: number;
}

declare interface ResourceRequest {
    roomName: string;
    requestorId: string;
    isRequestorCreep: boolean;
    resourceType: string;
}
