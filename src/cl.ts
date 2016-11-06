import memoryUtils = require('./memory');
import log = require('./log');
import spawnUtils = require('./spawn');
import functional = require('./functional');

export function createHarvestor(sourceId: string, spawnName: string): void {
    var source: Source = null;
    if (sourceId.substr(0, 4) == "Flag") {
        var flag = Game.flags[sourceId];
        if (flag === undefined)
            return log.error(() => {return `Could not find flag with name ${sourceId}.`})
        var sources = flag.pos.lookFor<Source>(LOOK_SOURCES);
        if (sources.length == 0)
            return log.error(() => {return `Could not find source near flag ${sourceId}`})
        source = sources[ 0 ];
    } else {
        source = Game.getObjectById<Source>(sourceId);
    }
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
    if (destination == null)
        destination = Game.creeps[destinationId];
    if (destination === undefined)
        destination = Game.spawns[destinationId];
    if (destination === undefined) {
        var destinationFlag = Game.flags[destinationId];
        if (destinationFlag === undefined)
            return;
        var destinations = destinationFlag.pos.lookFor<Structure>(LOOK_STRUCTURES);
        if (destinations.length == 0)
            return;
        destination = destinations[0];
    }
    var sourceIds = sourceCreepNames.map((creepName) => Game.creeps[creepName].id);
    if (destination === undefined)
        return log.error(() => {return `Destination id ${destinationId} not valid.`;});
    if (spawn === undefined)
        return log.error(() => {return `${spawnName} not a valid spawn name.`;});
    var transporterBody = spawnUtils.createTransporterBody(spawn);
    var transporterMemory = spawnUtils.createTransporterMemory(sourceIds, destination);
    spawnUtils.scheduleCreep(spawn, transporterBody, transporterMemory, 5);
}

export function createControllerUpgrader(spawnName: string, roomName: string): void {
    var spawn = Game.spawns[spawnName];
    var destination: Controller = Game.rooms[roomName].controller;
    var cuBody = spawnUtils.createHarvestorBody(spawn);
    var cuMemory = spawnUtils.createControllerUpgraderMemory(destination);
    spawnUtils.scheduleCreep(spawn, cuBody, cuMemory, 5); 
}

export function createArcher(spawnName: string, target: string) {
    var body = [MOVE, RANGED_ATTACK];
    var spawn = Game.spawns[spawnName];
    spawnUtils.addBodyParts(body, [MOVE, RANGED_ATTACK], spawn.energyCapacity);
    var memory: SoldierMemory = {
        role: "Archer",
        target: target
    }
    spawnUtils.scheduleCreep(spawn, body, memory, 4);
}

export function executeCustomCommand() {

    var nextCommandNumber = 1;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        log.info(() => `Executing command ${nextCommandNumber}`)
        
        
        // memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        // for (var spawnName in Game.spawns) {
        //     var spawn = Game.spawns[spawnName];
        //     var source = spawn.pos.findClosestByPath<Source>(FIND_SOURCES_ACTIVE);
        //     createHarvestor(source.id, spawn.name);
        // }
        

        // createHarvestor("FlagSourceMain", "Spawn1");
        // createHarvestor("FlagSourceMain", "Spawn1");
        // createHarvestor("Flag1", "Spawn1");

        //createTransporter("Spawn1", ["Transporter8"], "ControllerUpgrader7");
        // createControllerUpgrader("Spawn1", Game.spawns["Spawn1"].room.name);

        // for(var creepName in Game.creeps) {
        //     var creep = Game.creeps[creepName];
        //     if (memoryUtils.creepMemory(creep).role.toLowerCase() == "archer") {
        //         (<SoldierMemory>creep.memory).target = "92eecf3d33fab68377b59ac1";
        //     }
        // }

        // for(var i = 0; i < 50; ++i) {
        //     createArcher("Spawn1", "FlagSoldiers");
        // }

        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");
        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");
        // createHarvestor("07e778bc1205d6df6934dc6a", "Spawn1");

        //createTransporter("Spawn1", ["Harvestor4", "Harvestor10", "Harvestor7"], "80c70c98f3346d45f7c15891");

        log.info(() => `Successfully executed command ${nextCommandNumber}`)
    }
}