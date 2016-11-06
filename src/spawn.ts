import functional = require('./functional');
import sourceUtils = require('./source');
import mapUtils = require('./map');
import memoryUtils = require('./memory');
import log = require('./log');


export function process(spawn: StructureSpawn): void {
    // console.log("TBI: spawn.behavior.process " + spawn.name);
    var spawnMemory = memoryUtils.spawnMemory(spawn);
    if (spawn.energy < spawn.energyCapacity || spawnMemory.scheduledCreepOrders.length == 0) {
        return;
    }

    //until 33% capacity, focus on harvesting
    var sources = spawn.room.find<Source>(FIND_SOURCES);
    var actualCollected = sourceUtils.collectedEnergy(sources);
    var totalCapacity = sourceUtils.totalCapacity(sources);
    log.info(function () {
        return `spawn.process: actualCollected ${actualCollected}, totalCapacity ${totalCapacity}`;
    });

    spawnMemory.scheduledCreepOrders.sort(function (a: ScheduledCreepOrder, b: ScheduledCreepOrder): number { return b.priority - a.priority; });
    var topOrder = spawnMemory.scheduledCreepOrders.shift();
    spawn.createCreep(topOrder.body, topOrder.memory.role + memoryUtils.getUid(), topOrder.memory);
}


/**
 * Adds one MOVE part, one CARRY, plus as many WORK parts as possible.
 */
export function createHarvestorBody(spawn: StructureSpawn): string[] {
    log.debug(() => { return `spawn/createHarvestorBody: creating harvestor with available energy ${spawn.energy}` })
    return addBodyParts([MOVE, CARRY], [WORK], spawn.energyCapacity);
}

export function createHarvestorMemory(source: Source, destination: (Creep | Structure)): HarvestorMemory {
    return {
        role: "Harvestor",
        source: source.id,
        destination: destination.id
    };
}

export function createTransporterBody(spawn: StructureSpawn): string[] {
    return addBodyParts([MOVE, WORK, CARRY], [MOVE, CARRY], spawn.energyCapacity);
}

export function createTransporterMemory(sources: string[], destination: (Creep | Structure)): TransporterMemory {
    return {
        role: "Transporter",
        sources: sources,
        destination: destination.id
    };
}

export function createControllerUpgraderMemory(controller: Controller): ControllerUpgraderMemory {
    return {
        role: "ControllerUpgrader",
        destination: controller.id
    }
}

export function addBodyParts(input: string[], bodyPartsToAdd: string[], remainingEnergyInput: number): string[] {
    var remainingEnergy =
        remainingEnergyInput
        - functional.sum(
            input.map(function (bp) { return BODYPART_COST[bp]; })
        );
    if (bodyPartsToAdd.length == 0) {
        return input;
    }
    for (
        var idx = 0;
        remainingEnergy >= BODYPART_COST[bodyPartsToAdd[idx]];
        idx = (idx + 1) % bodyPartsToAdd.length
    ) {
        input.push(bodyPartsToAdd[idx]);
        remainingEnergy -= BODYPART_COST[bodyPartsToAdd[idx]];
    }
    log.debug(() => `spawn/addBodyParts: final remaining energy = ${remainingEnergy}`)
    return input;
}

export function scheduleCreep(spawn: StructureSpawn, body: string[], memory: CreepMemory, priority: number) {
    var spawnMemory = memoryUtils.spawnMemory(spawn);
    spawnMemory.scheduledCreepOrders.push({
        body: body,
        memory: memory,
        priority
    });
}