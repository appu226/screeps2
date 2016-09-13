import memoryUtils = require('./memory');

export function process(creep: Creep): void {
    if (creep.spawning) {
        return;
    }
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
        switch (harvestorMemory.destinationType) {
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

export function processTransporter(transporter: Creep) {
    var transporterMemory = <TransporterMemory>memoryUtils.creepMemory(transporter);
    if (transporterMemory.role != "Transporter") {
        console.log(
            "creep/processTransporter: unexpected role:",
            transporterMemory.role,
            ", expected: \"Transporter\"."
        );
        return;
    }
    if (transporter.carry.energy < transporter.carryCapacity * .8) {
        switch (transporterMemory.sourceType) {
            case "Source":
                return transportEnergyFromSource(
                    transporter,
                    transporterMemory,
                    <Source>Game.getObjectById(transporterMemory.source)
                );
            default:
                return console.log(
                    "creep/processTransporter: sourceType",
                    transporterMemory.sourceType,
                    "in creep",
                    transporter.name,
                    "not supported yet."
                );
        }
    } else {
        switch (transporterMemory.destinationType) {
            case "Spawn":
                var spawn = <Spawn>Game.getObjectById(transporterMemory.destination);
                if (transporter.transfer(spawn, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                    transporter.moveTo(spawn.pos.x, spawn.pos.y);
                }
                break;
            default:
                return console.log(
                    "creep/processTransporter: destinationType",
                    transporterMemory.destinationType,
                    "in creep",
                    transporter.name,
                    "not supported yet."
                );
        }
    }
}

export function transportEnergyFromSource(transporter: Creep, transporterMemory: TransporterMemory, source: Source): void {
    var sourceMemory = memoryUtils.sourceMemory(source);
    
    // get index of transporter in source's transporter list
    var tidx = sourceMemory.transporters.indexOf(transporter.name);
    if (tidx == 0) { //first transporter collects from harvestors
        if (sourceMemory.harvestors.length == 0) {
            return console.log(
                "creep/transportEnergyFromSource: transporter ",
                transporter.name,
                "cannot take from source",
                source.id,
                "because source has no registered harvestors."
            );
        }
        var harvestor = Game.creeps[sourceMemory.harvestors[0]];
        var extractionAttempt = transportEnergyFromCreep(transporter, harvestor);
        if (extractionAttempt == OK) {
            sourceMemory.harvestors.push(sourceMemory.harvestors.shift());
        }
    }
    //later transporters collect from the previous transporter 
    else if (tidx > 0 && tidx < sourceMemory.transporters.length) {
        transportEnergyFromCreep(transporter, Game.creeps[sourceMemory.transporters[tidx - 1]]);
        return;
    } else {
        console.log(
            "creep/transportEnergyFromSource: transporter",
            transporter.name,
            "should take from source",
            source.id,
            "but is not registered as a transporter in source.memory (tidx is",
            tidx,
            ")"
        );
    }
}

export function transportEnergyFromCreep(transporter: Creep, giver: Creep): number {
    var extractionAttempt = giver.transfer(transporter, RESOURCE_ENERGY);
    if (extractionAttempt == ERR_NOT_IN_RANGE) {
        transporter.moveTo(giver.pos.x, giver.pos.y);
    }
    return extractionAttempt;
}