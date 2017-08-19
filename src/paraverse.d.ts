declare interface Paraverse {
    game: Game;
    memory: Memory;
    map: GameMap;

    log: Logger;
    setLogLevel(level: number): void;

    bodyPartPriority: Dictionary<number>;

    getMyRooms(): RoomWrapper[];
    getMyCreeps(): CreepWrapper[];
    getMyCreepsByRoom(room: Room): CreepWrapper[];
    getMyCreepsByRoomAndType(room: Room, creepType: string): CreepWrapper[];
    getMySources(): SourceWrapper[];
    getSourceMemory(source: Source): SourceMemory;
    getMyStructures(): StructureWrapper[];
    getMyStructuresByRoom(room: Room): StructureWrapper[];
    getMyStructuresByRoomAndType(room: Room, structureType: string): StructureWrapper[];
    getStructureById(id: string): Option<StructureWrapper>;

    getSpawnMemory(spawn: StructureSpawn): SpawnMemory;

    getHostileCreepsInRoom(room: Room): Creep[];
    getHostileStructuresInRoom(room: Room): Structure[];

    getCreepOrders(roomName: string): PQ<CreepOrder>;
    scheduleCreep(room: Room, order: CreepOrder, priority: number): void;
    removeCreepOrder(roomName: string, orderName: string): void;
    makeBuilderOrder(orderName: string): CreepOrder;
    makeHarvesterOrder(orderName: string, sourceId: string): CreepOrder;
    makeTransporterOrder(orderName: string): CreepOrder;
    makeUpgraderOrder(orderName: string, roomName: string): CreepOrder;
    makeDefenderOrder(orderName: string, targetId: string): CreepOrder;

    requestResourceReceive(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void;
    requestResourceSend(roomName: string, requestorId: string, isRequestorCreep: boolean, resourceType: string, amount: number): void;
    manageSupplyAndDemand(): void;
    recordDeliveryIntent(destinationId: string, resourceName: string): void;
    recordCollectionIntent(sourceId: string, resourceName: string): void;
    getDeliveryIntent(destinationId: string, resourceName: string): number;
    getCollectionIntent(sourceId: string, resourceName: string): number;

    getConstructionSitesFromRoom(room: Room): ConstructionSite[];
    getConstructionSitesFromRoomOfType(room: Room, structureType: string): ConstructionSite[];
    getTerrain(room: Room): number[][];
    getPossibleMoveSites(room: Room): boolean[][];
    getPossibleConstructionSites(room: Room): boolean[][];
    getPossibleCollectionSites(room: Room): boolean[][];

    constructNextSite(room: Room, structureType: string): boolean;
    constructNextContainer(source: Source): boolean;

    isCloseToLair(source: Source, sourceMemory: SourceMemory): boolean;

    moveCreep(cw: CreepWrapper, pos: RoomPosition): boolean;
    makeCreepWrapper(c: Creep): CreepWrapper;
    isHarvesterWithSource(creepWrapper: CreepWrapper, sourceId: string): boolean;
    getTransporterEfficiency(room: Room): number;
    pushEfficiency(memory: CreepMemory, efficiency: number): void;
    getEfficiency(memory: CreepMemory): number;
    avoidObstacle(creepWrapper: CreepWrapper): void;
    recordDefense(soldier: Creep, enemyId: string): void;
    getTotalCollectedDefense(enemyId: string): number;
    getSoldierCapability(soldier: Creep): number;

    getTowerMemory(towerId: string): TowerMemory;
    setTowerMemory(towerId: string, towerMemory: TowerMemory): void;

    getWallHitPoints(room: Room): number;
    setWallHitPoints(room: Room, hitPoints: number): void;

    mustBuildRoad(room: Room): boolean;
    getRoadToBeBuilt(room: Room): XY;

    getUid(): number;

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

    TERRAIN_CODE_PLAIN: number;
    TERRAIN_CODE_SWAMP: number;
    TERRAIN_CODE_WALL: number;
    TERRAIN_CODE_LAVA: number;
    TERRAIN_CODE_STRUCTURE: number;
    TERRAIN_CODE_SOURCE: number;
    TERRAIN_CODE_CREEP: number;
    TERRAIN_CODE_CONSTRUCTION_SITE: number;

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
    isCloseToLair: boolean;
    containerId: string;
    numCollectionSlots: number;
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

declare interface TowerMemory {
    status: string;
    target: string;
}

declare interface SpawnMemory {
    lastTickEnergy: number;
    ticksSinceLastDonation: number;
}