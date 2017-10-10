declare interface Paraverse {
    game: Game;
    memory: Memory;
    map: GameMap;

    bodyPartPriority: Dictionary<number>;

    getMyRooms(): RoomWrapper[];
    getMyCreeps(): CreepWrapper[];
    getMyCreepsByRoom(room: Room): CreepWrapper[];
    getMyCreepsByRoomAndType(room: Room, creepType: string): CreepWrapper[];
    getCreepById(id: string): Option<CreepWrapper>;
    getRemoteMinersBySourceId(sourceId: string): CreepWrapper[];
    getMySources(): SourceWrapper[];
    getSourceMemory(source: Source): SourceMemory;
    getMyStructures(): StructureWrapper[];
    getMyStructuresByRoom(room: Room): StructureWrapper[];
    getMyStructuresByRoomAndType(room: Room, structureType: string): StructureWrapper[];
    getStructureById(id: string): Option<StructureWrapper>;
    getRequestorById(id: string): Option<ResourceRequestor>;
    getMyFlags(): Flag[];
    getMyFlagsByRoom(roomName: string): Flag[];
    getMyFlagsByRoomAndColors(room: Room, color: number, secondaryColor: number): Flag[];

    manageResources(room: Room): void;

    getSpawnMemory(spawn: StructureSpawn): SpawnMemory;

    getRoomMemory(room: Room): RoomMemory;

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
    makeClaimerOrder(orderName: string, roomName: string, roomPath: string[], addClaimPart: boolean): CreepOrder;
    makeRemoteMinerOrder(orderName: string, sourceId: string, collectionRoom: string, deliveryRoom: string): CreepOrder;

    getConstructionSitesFromRoom(room: Room): ConstructionSite[];
    getConstructionSitesFromRoomOfType(room: Room, structureType: string): ConstructionSite[];
    getTerrain(room: Room): number[][];
    getPossibleMoveSites(room: Room): boolean[][];
    getPossibleConstructionSites(room: Room): boolean[][];
    getPossibleCollectionSites(room: Room): boolean[][];

    constructNextSite(room: Room, structureType: string): boolean;
    constructNextContainer(source: Source): boolean;
    constructNextStorage(room: Room): boolean;

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

    resourceAmount(storage: Dictionary<number>, resourceType: string): number;
    availableSpace(storage: Dictionary<number>, capacity: number): number;

    getTowerMemory(towerId: string): TowerMemory;
    setTowerMemory(towerId: string, towerMemory: TowerMemory): void;

    getWallHitPoints(room: Room): number;
    setWallHitPoints(room: Room, hitPoints: number): void;

    mustBuildRoad(room: Room): boolean;
    getRoadToBeBuilt(room: Room): XY;

    getUid(): number;

    euclidean(p1: RoomPosition, p2: RoomPosition): number;
    manhattan(p1: RoomPosition, p2: RoomPosition): number;

    log(categories: string[], message: (() => string)): void;
    startTimer(label: string): void;
    endTimer(label: string): void;
    printTimings(): void;

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
    CREEP_TYPE_REMOTE_MINER: string;

    TERRAIN_CODE_PLAIN: number;
    TERRAIN_CODE_SWAMP: number;
    TERRAIN_CODE_WALL: number;
    TERRAIN_CODE_LAVA: number;
    TERRAIN_CODE_STRUCTURE: number;
    TERRAIN_CODE_SOURCE: number;
    TERRAIN_CODE_CREEP: number;
    TERRAIN_CODE_CONSTRUCTION_SITE: number;

    DELIVERY_AMOUNT: number;

    PULL_REQUEST: number;
    PUSH_REQUEST: number;
}

declare interface Logger {
    log(categories: string[], message: (() => string)): void;
}

declare interface ResourceRequest {
    roomName: string;
    resourceType: string;
    amount: number;
    requestorId: string;
    resourceRequestType: number;
    isBlocker: boolean;
}

declare interface ResourceRequestor {
    resourceRequests: ResourceRequest[];
    giveResourceToCreep(creep: Creep, resourceType: string, amount: number): number;
    takeResourceFromCreep(creep: Creep, resourceType: string, amount: number): number;
    element: Creep | Structure;
}

declare interface StructureWrapper extends ResourceRequestor {
    element: Structure;
    process(pv: Paraverse): void;
    my: boolean;
}

declare interface CreepWrapper extends ResourceRequestor {
    element: Creep;
    creepType: string;
    memory: CreepMemory;
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
    lastX: number;
    lastY: number;
    lastTimeOfMoveAttempt: number;
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

declare interface XY {
    x: number;
    y: number;
}

declare interface TowerMemory {
    status: string;
    target: string;
}

declare interface SpawnMemory {
    lastTickEnergy: number;
    ticksSinceLastDonation: number;
}

declare interface RoomPath {
    path: string[];
    destination: string;
}

declare interface RemoteMines {
    sourceRoomName: string;
    sourceId: string;
}

declare interface RoomMemory {
    queuedResourceRequests: ResourceRequest[];
    roomsToClaim: RoomPath[];
    roomsToSign: RoomPath[];
    remoteMines: RemoteMines[];
}

declare interface TimerLog {
    totalTime: number;
    totalTimeSq: number;
    count: number;
}