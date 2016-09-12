import functional = require('./functional');
import sourceUtils = require('./source');
import mapUtils = require('./map');
import memoryUtils = require('./memory');


export function process(spawn: StructureSpawn): void {
    // console.log("TBI: spawn.behavior.process " + spawn.name);
    if (spawn.energy < spawn.energyCapacity) {
        return;
    }

    //until 33% capacity, focus on harvesting
    //console.log("spawn.behavior.process actualCollected " + actualCollected + ", totalCapacity " + totalCapacity);
    var actualCollected = sourceUtils.collectedEnergy(spawn.memory.sortedSources);
    var totalCapacity = sourceUtils.totalCapacity(spawn.memory.sortedSources);
    if (actualCollected < totalCapacity * .33) {
        return buildHarvesterOrTransporter(spawn);
    }
    
    // Make sure number of soldiers is at least half the number of transporters and extractors.
    var numberOfSoldiers = 0;
    var numberOfWorkers = 0;
    for (var creepName in Game.creeps) {
        var creepMemory = memoryUtils.creepMemory(Game.creeps[creepName]);
        if (isSoldier(creepMemory.role)) {
            ++numberOfSoldiers;
        } else {
            ++numberOfWorkers;
        }
    }
    if (numberOfSoldiers < numberOfWorkers * 0.5) {
        return buildSoldier(numberOfSoldiers, spawn);
    }
    
    // Ensure 95% collection of energy.
    if (actualCollected < totalCapacity * 0.95) {
        return buildHarvesterOrTransporter(spawn);
    }
    
    console.log("Energy collection maximized, now what ??!!");
    
}

/**
 * @Param {StructureSpawn} spawn
 */
export function buildHarvesterOrTransporter(spawn: StructureSpawn): void {
    // console.log("TBI: spawn.behavior.buildHarvesterOrTransporter");
    var sortedSources = memoryUtils.spawnMemory(spawn).sortedSources;
    for (var sourceIdx = 0; sourceIdx < sortedSources.length; ++sourceIdx) {
        var source = <Source>Game.getObjectById(sortedSources[sourceIdx].id);
        var sourceMemory = memoryUtils.sourceMemory(source);

        // The theoretical maximum collection rate.
        var maxCollectionRate = source.energyCapacity / sourceUtils.timeToRegeneration;

        // The actual amount of energy collected.
        var energyCollection = memoryUtils.sourceMemory(source).energyCollection
        var actualCollectionRate = energyCollection.total / energyCollection.history.length;

        // The maximum amount harvestors can extract.
        var maxHarvestingRate =
            functional.sum(
                sourceMemory.harvestors.map(
                    function(harvesterName) {
                        return Game.creeps[harvesterName].getActiveBodyparts(WORK) * 2;
                    })
            );
            
        console.log(
            "spawn.ts:buildHarvestorOrTransporter: Source", 
            source.id, 
            "maxCollectionRate",
            maxCollectionRate,
            "actualCollectionRate",
            actualCollectionRate,
            "maxHarvestingRate",
            maxHarvestingRate);
            
        // If adding extractors would help, do that.
        if (maxHarvestingRate < maxCollectionRate) {
            var harvestorBody = createHarvestorBody(spawn);
            var harvestorMemory = createHarvestorMemory(source, spawn);
            var creepName = "Harvestor_" + memoryUtils.getUid();
            if (creepName == spawn.createCreep(harvestorBody, creepName, harvestorMemory)) {
                sourceMemory.harvestors.push(creepName);
            }
            return;
        } 
        // If adding transporters would help, do that.
        else if (actualCollectionRate < maxCollectionRate) {
            var transporterBody = createTransporterBody(spawn);
            var transporterName = "Transporter_" + memoryUtils.getUid();
            var transporterMemory = createTransporterMemory(source, spawn);
            if (transporterName == spawn.createCreep(transporterBody, transporterName, transporterMemory)) {
                sourceMemory.transporters.push(transporterName);
            }
            return;
        }
    }
}

export function isSoldier(role: string): boolean {
    return (role == "Archer" || role == "Militia" || role == "Healer")
}

export function buildSoldier(numberOfSolders: number, spawn: StructureSpawn): void {
    console.log("spawn.ts: buildSoldier: TBI");
}

/**
 * Adds one MOVE part, one CARRY, plus as many WORK parts as possible.
 */
export function createHarvestorBody(spawn: StructureSpawn): string[] {
    return addBodyParts([MOVE, CARRY], [WORK], spawn.energy);
}

export function createHarvestorMemory(source: Source, spawn: StructureSpawn): HarvestorMemory {
    return {
        role: "Harvestor",
        source: source.id,
        sourceType: "Source",
        destination: spawn.id,
        destinationType: "Spawn"
    };
}

export function createTransporterBody(spawn: StructureSpawn): string[] {
    return addBodyParts([], [MOVE, CARRY], spawn.energy);
}

export function createTransporterMemory(source: Source, spawn: StructureSpawn): TransporterMemory {
    return {
        role: "Transporter",
        source: source.id,
        sourceType: "Source",
        destination: spawn.id,
        destinationType: "Spawn"
    };
}

export function addBodyParts(input: string[], bodyPartsToAdd: string[], remainingEnergy: number): string[] {
    remainingEnergy -=
        functional.sum(
            input.map(function(bp) { return BODYPART_COST[bp];})
        );
    if (bodyPartsToAdd.length == 0) {
        return input;
    }
    var idx = 0;
    while (remainingEnergy >= BODYPART_COST[bodyPartsToAdd[idx]]) {
        input.push(bodyPartsToAdd[idx]);
        remainingEnergy -= BODYPART_COST[bodyPartsToAdd[idx]];
    }
    return input;
}