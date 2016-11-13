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
    if (destination === undefined)
        return log.error(() => {return `Destination id ${destinationId} not valid.`;});
    if (spawn === undefined)
        return log.error(() => {return `${spawnName} not a valid spawn name.`;});
    var transporterBody = spawnUtils.createTransporterBody(spawn);
    var transporterMemory = spawnUtils.createTransporterMemory(sourceCreepNames, destination);
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

export function createHarvestorChain(spawnName: string, sourceId: string, numHarvestors: number, numTransporters: number, destination: string) {
    var uid =  memoryUtils.getUid();
    var transporterSources: string[] = [];
    for (var hid = 0; hid < numHarvestors; ++hid) {
        transporterSources.push("Harvestor" + (++uid));
        createHarvestor(sourceId, spawnName);
    }
    for (var tid = 0; tid < numTransporters; ++tid) {
        createTransporter(spawnName, transporterSources, destination);
        transporterSources = ["Transporter" + (++uid)];
    }
}

export function createRoadSite(source: RoomPosition, destination: RoomPosition) {
    var path = source.findPathTo(destination);
    for (var idx = 0; idx < path.length; ++idx) {
        new RoomPosition(path[idx].x, path[idx].y, source.roomName).createConstructionSite(STRUCTURE_ROAD);
    }
}

export function createBuilder(spawnName: string) {
    var spawn = Game.spawns[spawnName];
    var bBody = spawnUtils.createHarvestorBody(spawn);
    var bMemory: CreepMemory = {
        role: "Builder"
    };
    spawnUtils.scheduleCreep(spawn, bBody, bMemory, 5);
}

export function executeCustomCommand() {

    var nextCommandNumber = 11;
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
        // createTransporter("Spawn1", ["Harvestor0","Harvestor1","Harvestor2"], "Spawn1");
        // createHarvestor("Flag1", "Spawn1");

        // createTransporter("Spawn1", ["Transporter20"], "ControllerUpgrader6");
        // createTransporter("Spawn1", ["Harvestor7"], "ControllerUpgrader6");
        // createTransporter("Spawn1", ["Harvestor7"], "ControllerUpgrader6");

        // createHarvestorChain("Spawn1", "FlagSourceMain", 3, 1, "Spawn1");
        // createControllerUpgrader("Spawn1", Game.spawns["Spawn1"].room.name);
        // createHarvestorChain("Spawn1", "FlagSourceNE", 1, 3, "ControllerUpgrader6")
        
        // for (var arnum = 0; arnum < 40; ++arnum)
        //     createArcher("Spawn1", "FlagSoldierMain");

        // createRoadSite(Game.flags['FlagSourceSE'].pos, Game.spawns['Spawn1'].pos);

        // for (var creepName in Game.creeps) {
        //     var creep = Game.creeps[creepName];
        //     var cm = memoryUtils.creepMemory(creep);
        //     if (cm.role != "Archer")
        //         continue;
        //     var am = <SoldierMemory>cm;
        //     am.target = "FlagSoldierSW";
        // }
        


        // createTransporter("Spawn1", ["Transporter8"], "ControllerUpgrader7");
        // createHarvestor("FlagSourceNE", "Spawn1");
        // createControllerUpgrader("Spawn1", Game.spawns["Spawn1"].room.name);
        // createTransporter("Spawn1", ["Harvestor4"], "ControllerUpgrader5");

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