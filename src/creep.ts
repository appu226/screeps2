import memoryUtils = require('./memory');
import mapUtils = require('./map');

export function process(creep: Creep): void {
    if (creep.spawning) {
        return;
    }
    var creepMemory = memoryUtils.creepMemory(creep);
    switch (creepMemory.role) {
        case "Harvestor":
            return processHarvestor(creep);
        case "Transporter":
            return processTransporter(creep);
        case "Archer":
            return processArcher(creep);
        case "Militia":
            return processMilitia(creep);
        case "Healer":
            return processHealer(creep);
        default:
            console.warn("Could not identify role type " + creepMemory.role + " for creep " + creep.name);
    }
}

export function processArcher(creep: Creep): void {
    var archerMemory = <SoldierMemory>memoryUtils.creepMemory(creep);
    if (archerMemory.role != "Archer") {
        return console.log("creep/processArcher: Unexpected role, found:", archerMemory.role, "expected: Archer.");
    }
    if (archerMemory.target != "") {
        switch (archerMemory.targetType) {
            case "Creep": {
                var targetCreep = <Creep>Game.getObjectById(archerMemory.target);
                if (targetCreep == null || targetCreep.hits == 0) {
                    return;
                }
                var distance = Math.max(Math.abs(targetCreep.pos.x - creep.pos.x), Math.abs(targetCreep.pos.y - creep.pos.y));
                creep.rangedAttack(targetCreep);
                if (distance <= 2) {
                    var direction = creep.pos.getDirectionTo(targetCreep.pos);
                    var oppositeDirection = mapUtils.oppositeDirection(direction);
                    creep.move(oppositeDirection);
                } else if (distance > 3) {
                    creep.moveTo(targetCreep.pos);
                }
                return;
            }
            default: {
                console.log("creep/processArcher: Target type", archerMemory.targetType, "not yet supported.")
            }
        }
    }
}

export function processMilitia(militia: Creep) {
    // console.log("creep/processMilitia: TBI.");
    var militiaMemory = <SoldierMemory>memoryUtils.creepMemory(militia);
    if (militiaMemory.role != "Militia")
        return console.log("creep/processMilitia: Unexpected role, found: ", militiaMemory.role, "expected: Militia.")
    if (militiaMemory.target != "") {
        var target = Game.getObjectById<Creep | Spawn | Structure>(militiaMemory.target);
        if (militia.attack(target) == ERR_NOT_IN_RANGE)
            militia.moveTo(target.pos);
    }
}

export function processHealer(healer: Creep) {
    // console.log("creep/processHealer: TBI.")
    var healerMemory = <SoldierMemory>memoryUtils.creepMemory(healer);
    if (healerMemory.role != "Healer")
        return console.log("creep/processHeale: Unexpected role, found: ", healerMemory.role, "expected: Healer");
    if (healerMemory.target != "") {
        var target = Game.getObjectById<Creep>(healerMemory.target);
        if (healer.heal(target) == ERR_NOT_IN_RANGE)
            healer.moveTo(target);
    }
}

export function processHarvestor(creep: Creep): void {
    var creepMemory = memoryUtils.creepMemory(creep);
    if (creepMemory.role != "Harvestor") {
        console.error("Unexpected role in creep", creep.name, ". Expected: \"Harvestor\", found \"" + creepMemory.role + "\".");
    }
    var harvestorMemory = <HarvestorMemory>creepMemory;

    // if capacity is full, transfer to destination. 
    if (creep.carry.energy == creep.carryCapacity) {
        var destination: (Structure | Creep) = null;
        switch (harvestorMemory.destinationType) {
            case "Spawn": {
                var spawn = <Structure>Game.getObjectById(harvestorMemory.destination);
                var transporters = memoryUtils.transporterChain("Source", harvestorMemory.source, "Spawn", spawn.id).transporterNames;
                if (transporters.length > 0) {
                    destination = Game.creeps[transporters[0]];
                } else {
                    destination = spawn;
                }
                break;
            }
            case "Creep": {
                destination = <Creep>Game.getObjectById(harvestorMemory.destination);;
                break;
            }
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
    // console.log("creep/processTransporter: starting");
    var transporterMemory = <TransporterMemory>memoryUtils.creepMemory(transporter);
    if (transporterMemory.role != "Transporter") {
        console.log(
            "creep/processTransporter: unexpected role:",
            transporterMemory.role,
            ", expected: \"Transporter\"."
        );
        return;
    }
    var transporterChain = getTransporterChain(transporter);
    if (transporter.carry.energy < transporter.carryCapacity) {
        switch (transporterMemory.sourceType) {
            case "Source":
                return transportEnergyFromSource(
                    transporter,
                    transporterMemory,
                    Game.getObjectById<Source>(transporterMemory.source),
                    transporterChain
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
        return transportEnergyToDestination(
            transporter,
            transporterMemory,
            transporterChain
        );
    }
}

export function transportEnergyToDestination(
    transporter: Creep,
    transporterMemory: TransporterMemory,
    transporterChain: string[]) {

    var tidx = transporterChain.indexOf(transporter.name);

    // Last transporter gives to destination.
    if (tidx == transporterChain.length - 1) {
        switch (transporterMemory.destinationType) {
            case "Spawn": {
                var spawn = Game.getObjectById<Spawn>(transporterMemory.destination);
                var transferAttempt = transporter.transfer(spawn, RESOURCE_ENERGY);
                if (transferAttempt == ERR_NOT_IN_RANGE) {
                    transporter.moveTo(spawn.pos.x, spawn.pos.y);
                }
                break;
            }
            default:
                return console.log(
                    "creep/processTransporter: destinationType",
                    transporterMemory.destinationType,
                    "in creep",
                    transporter.name,
                    "not supported yet."
                );
        }
    } else
        // All other transporters give to next transporter
        if (tidx >= 0 && tidx < transporterChain.length - 1) {
            var nextTansporter = Game.creeps[transporterChain[tidx + 1]];
            if (transporter.transfer(nextTansporter, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                transporter.moveTo(nextTansporter.pos);
            }
        } else
            console.log("creep/transportEnergyToDestination: transporter",
                transporter,
                "not found in transporterChain",
                transporterChain.toString
            );
}

export function getTransporterChain(creep: Creep): string[] {
    // console.log("creep.getTransporterChain starting");
    var memory: HarvestorMemory | TransporterMemory = null;
    switch (memoryUtils.creepMemory(creep).role) {
        case "Transporter":
            memory = <TransporterMemory>creep.memory;
            break;
        case "Harvestor":
            memory = <HarvestorMemory>creep.memory;
            break;
        default:
            return [];
    }
    return memoryUtils.transporterChain(
        memory.sourceType,
        memory.source,
        memory.destinationType,
        memory.destination
    ).transporterNames;
}

export function transportEnergyFromSource(
    transporter: Creep,
    transporterMemory: TransporterMemory,
    source: Source,
    transporterChain: string[]
): void {

    var sourceMemory = memoryUtils.sourceMemory(source);

    // get index of transporter in source's transporter list
    var tidx = transporterChain.indexOf(transporter.name);
    if (tidx == 0) { //first transporter collects from harvestors
        // console.log("creep/transportEnergyFromSource: extracting from harvestors.");
        if (sourceMemory.harvestors.length == 0) {
            return console.log(
                "creep/transportEnergyFromSource: transporter ",
                transporter.name,
                "cannot take from source",
                source.id,
                "because source has no registered harvestors."
            );
        }
        var maxHarvestor =
            sourceMemory.harvestors.slice().sort(
                function (h1, h2) { return Game.creeps[h2].carry.energy - Game.creeps[h1].carry.energy; }
            )[0];
        var harvestor = Game.creeps[maxHarvestor];
        if (harvestor.transfer(transporter, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            transporter.moveTo(harvestor.pos);
        }
    }
    //later transporters collect from the previous transporter 
    else if (tidx > 0 && tidx < transporterChain.length) {
        var extractionAttempt = transportEnergyFromCreep(transporter, Game.creeps[transporterChain[tidx - 1]]);
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