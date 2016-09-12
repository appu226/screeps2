import memoryUtils = require('./memory');

export function process(creep: Creep): void {
    var creepMemory = memoryUtils.creepMemory(creep);
    switch (creepMemory.role) {
        case "Harvestor":
            processHarvestor(creep);
            break;
        case "Transporter":
            processTransporter(creep);
            break;
        default:
            console.warn("Could not identify role type " + creepMemory.role + " for creep " + creep.name);
    }
}

export function processHarvestor(creep: Creep): void {
    var creepMemory = memoryUtils.creepMemory(creep);
    if (creepMemory.role != "Harvestor") {
        console.error("Unexpected role in creep", creep.name, ". Expected: \"Harvestor\", found \"", creepMemory.role, "\".");
    }
    var harvestorMemory = <HarvestorMemory>creepMemory;
    
    // if capacity is full, transfer to destination. 
    if (creep.carry.energy == creep.carryCapacity) {
        var destination: (Structure | Creep) = null; 
        switch(harvestorMemory.destinationType) {
            case "Spawn":
                destination = <Structure>Game.getObjectById(harvestorMemory.destination);
                break;
            case "Creep":
                destination = <Creep>Game.getObjectById(harvestorMemory.destination);;
                break;
            default:
                throw "Could not identify destinationType " + harvestorMemory.destinationType;
        }
        if (creep.transfer(destination, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(destination.pos.x, destination.pos.y);
        }
        return;
    }
    // extract from source 
    else {
        var source = <Source>Game.getObjectById(harvestorMemory.source);
        if (creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source.pos.x, source.pos.y);
        }
        return;
    }
}

export function processTransporter(creep: Creep) {
    console.log("processTransporter TBI");
}