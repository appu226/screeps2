import memoryUtils = require('./memory');
import log = require('./log');
import spawnUtils = require('./spawn');
import functional = require('./functional');

export function createHarvestor(sourceId: string, spawnName: string): void {
    var source = Game.getObjectById<Source>(sourceId);
    var spawn = Game.spawns[spawnName];
    if (source === undefined)
        return log.error(() => {return `${sourceId} not a valid source id.`;});
    if (spawn === undefined)
        return log.error(() => {return `${spawnName} not a valid spawn.`;});
    var harvestorBody = spawnUtils.createHarvestorBody(spawn);
    var harvestorMemory = spawnUtils.createHarvestorMemory(source, spawn);
    spawnUtils.scheduleCreep(spawn, harvestorBody, harvestorMemory, 5);
}

export function createTransporter(spawnName: string, sourceCreepNames: string[], destinationId: string): void {
    var spawn = Game.spawns[spawnName];
    var destination = Game.getObjectById<Creep | Structure>(destinationId);
    var sourceIds = sourceCreepNames.map((creepName) => Game.creeps[creepName].id);
    if (destination === undefined)
        return log.error(() => {return `Destination id ${destinationId} not valid.`;});
    if (spawn === undefined)
        return log.error(() => {return `${spawnName} not a valid spawn name.`;});
    var transporterBody = spawnUtils.createTransporterBody(spawn);
    var transporterMemory = spawnUtils.createTransporterMemory(sourceIds, destination);
    spawnUtils.scheduleCreep(spawn, transporterBody, transporterMemory, 5);
}

export function executeCustomCommand() {

    var nextCommandNumber = 8;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(() => `Executing command ${nextCommandNumber}`)
        
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        for (var spawnName in Game.spawns) {
            var spawn = Game.spawns[spawnName];
            var source = spawn.pos.findClosestByPath<Source>(FIND_SOURCES_ACTIVE);
            createHarvestor(source.id, spawn.name);
        }

        // createHarvestor("3dc0722c314d8ded867469c4", "Spawn1");
        // createHarvestor("3dc0722c314d8ded867469c4", "Spawn1");

        //createTransporter("Spawn1", ["Harvestor0", "Harvestor1", "Harvestor2"], "80c70c98f3346d45f7c15891");

        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");
        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");
        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");

        //createTransporter("Spawn1", ["Harvestor4", "Harvestor10", "Harvestor7"], "80c70c98f3346d45f7c15891");

        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}