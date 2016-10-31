import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');

export function process(creep: Creep) {
    log.debug(() => {return `creep.process: Processing creep ${creep.id}`;})
    var memory = memoryUtils.creepMemory(creep);
    if (memory.role.toLowerCase() == "harvestor") {
        var harvestorMemory = <HarvestorMemory>memory;
        return harvestEnergyFromSourceToCreepOrStructure(
            creep,
            Game.getObjectById<Source>(harvestorMemory.source),
            Game.getObjectById<Creep | Structure>(harvestorMemory.destination)
        );
    }
    else if (memory.role.toLowerCase() == "transporter") {
        var transporterMemory = <TransporterMemory>memory;
        
        //sort sources by decreasing order of energy
        transporterMemory.sources = 
            transporterMemory.sources
                .map( // append energy to each creep id
                id => { return { creepId: id, energy: Game.getObjectById<Creep>(id).carry.energy } }
                ).sort( // sort in decreasing order of energy
                (a, b) => { return b.energy - a.energy; }
                ).map( // get back creepIds
                a => { return a.creepId; }
                );
        
        // point the source to yourself
        var source = Game.getObjectById<Creep>(transporterMemory.sources[0]);
        var sourceMemory = <any>memoryUtils.creepMemory(source);
        if(sourceMemory.destination !== undefined) {
            sourceMemory.destination = creep.id;
        }
        
        return transportEnergyFromCreepToCreepOrStructure(
            creep,
            source,
            Game.getObjectById<Creep | Structure>(transporterMemory.destination)
        )
    }
    else {
        log.error(function () {
            return "Unsupported creep role " + memory.role;
        });
    }
}

function moveCreepToPosition(creep: Creep, pos: RoomPosition) {
    log.debug(() => {return `creep.moveCreepToPosition: creep ${creep.id}, pos ${pos.roomName}(${pos.x},${pos.y})`});
    if (creep.pos.roomName == pos.roomName) {
        creep.moveTo(pos.x, pos.y);
    } else {
        log.error(
            function () {
                return "moveCreepToPosition( " +
                    creep.name + ", " +
                    "( " + pos.x + ", " + pos.y + " ), " +
                    ") does not support unequal room names " +
                    "(creep: " + creep.pos.roomName + ", pos: " +
                    pos.roomName + ").";
            }
        );
    }
}

function harvestEnergyFromSource(creep: Creep, source: Source) {
    log.debug(() => {return `creep.harvestEnergyFromSource: processing creep ${creep.id}, source ${source.id}`;});
    var harvestAttempt = creep.harvest(source);
    if (harvestAttempt == ERR_NOT_IN_RANGE) {
        moveCreepToPosition(creep, source.pos);
    }
}

function giveResourceToStructureOrCreep(creep: Creep, target: Structure | Creep, resourceType: string) {
    log.debug(() => {return `creep.giveResourceToStructureOrCreep: processing creep ${creep.id}, target ${target.id}, resourceType ${resourceType}`;});
    if (creep.transfer(target, resourceType) == ERR_NOT_IN_RANGE) {
        moveCreepToPosition(creep, target.pos);
    }
}

function takeResourceFromCreep(creep: Creep, source: Creep, resource: string) {
    if (source.transfer(creep, resource) == ERR_NOT_IN_RANGE) {
        moveCreepToPosition(creep, source.pos);
    }
}

function harvestEnergyFromSourceToCreepOrStructure(creep: Creep, source: Source, target: Structure | Creep) {
    log.debug(() => {return `creep.harvestEnergyFromSourceToCreepOrStructure: processing creep ${creep.id}, source ${source.id}, destination ${target.id}`;})
    if (
        creep.carry.energy == creep.carryCapacity // creep is full 
        ||
        source.energy == 0  // source is empty
    ) {
        giveResourceToStructureOrCreep(creep, target, RESOURCE_ENERGY);
    } else {
        harvestEnergyFromSource(creep, source);
    }
}

function transportEnergyFromCreepToCreepOrStructure(creep: Creep, source: Creep, target: Structure | Creep) {
    if (creep.carry.energy == creep.carryCapacity
        || source.carry.energy == 0) {
        giveResourceToStructureOrCreep(creep, target, RESOURCE_ENERGY);
    } else {
        takeResourceFromCreep(creep, source, RESOURCE_ENERGY);
    }
}