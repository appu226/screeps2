import memoryUtils = require('./memory');
import mapUtils = require('./map');
import log = require('./log');

function archerDefendPos(creep: Creep, archerMem: SoldierMemory, posToBe: RoomPosition) {
    type Attackable = Creep | OwnedStructure;
    var hostileThingsInRange: Attackable[] = creep.pos.findInRange<Attackable>(FIND_HOSTILE_CREEPS, 5).concat(
        creep.pos.findInRange<Attackable>(FIND_HOSTILE_STRUCTURES, 5)
    );
    if (posToBe.getRangeTo(creep.pos) > 10) {
        if (hostileThingsInRange.length)
            creep.rangedAttack(creep.pos.findClosestByRange(hostileThingsInRange));
        creep.moveTo(posToBe);
    }
    else {
        if (hostileThingsInRange.length == 0) {
            if (posToBe.getRangeTo(creep.pos) > 5)
                creep.moveTo(posToBe);
        } else {
            var closestHostile = creep.pos.findClosestByRange(hostileThingsInRange);
            if (creep.rangedAttack(closestHostile) == ERR_NOT_IN_RANGE) {
                creep.moveTo(closestHostile);
            }
        }
    }
}

export function process(creep: Creep) {
    log.debug(() => { return `creep.process: Processing creep ${creep.id}`; })
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
                creepName => { return { creepName: creepName, energy: Game.creeps[creepName].carry.energy } }
                ).sort( // sort in decreasing order of energy
                (a, b) => { return b.energy - a.energy; }
                ).map( // get back creepIds
                a => { return a.creepName; }
                );

        // point the source to yourself
        var source = Game.creeps[transporterMemory.sources[0]];
        var sourceMemory = <any>memoryUtils.creepMemory(source);
        if (sourceMemory.destination !== undefined) {
            sourceMemory.destination = creep.id;
        }

        return transportEnergyFromCreepToCreepOrStructure(
            creep,
            source,
            Game.getObjectById<Creep | Structure>(transporterMemory.destination)
        )
    } else if (memory.role.toLowerCase() == "controllerupgrader") {
        var cuMem = <ControllerUpgraderMemory>memory;
        var controller = Game.getObjectById<Controller>(cuMem.destination);
        if (creep.pos.isNearTo(controller.pos))
            creep.upgradeController(controller);
        else
            creep.moveTo(controller);
    } else if (memory.role.toLowerCase() == "archer") {
        var archerMem = <SoldierMemory>memory;
        if (Game.flags[archerMem.target] !== undefined) {
            archerDefendPos(creep, archerMem, Game.flags[archerMem.target].pos)
        } else {
            var attackable = Game.getObjectById<Creep | OwnedStructure>(archerMem.target);
            if (attackable == null)
                return;
            else if (attackable.my)
                archerDefendPos(creep, archerMem, attackable.pos);
            else if (creep.rangedAttack(attackable) == ERR_NOT_IN_RANGE)
                creep.moveTo(attackable.pos);
        }
    } else if (memory.role.toLowerCase() == "builder") {
        var room = Game.rooms[creep.pos.roomName];
        var sites = room.find<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);
        if (sites.length > 0) {
            var site = creep.pos.findClosestByPath(sites);
            if (creep.build(site) == ERR_NOT_IN_RANGE)
                creep.moveTo(site);
        }
    }
    else {
        log.error(function () {
            return "Unsupported creep role " + memory.role;
        });
    }
}

function moveCreepToPosition(creep: Creep, pos: RoomPosition) {
    log.debug(() => { return `creep.moveCreepToPosition: creep ${creep.id}, pos ${pos.roomName}(${pos.x},${pos.y})` });
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
    log.debug(() => { return `creep.harvestEnergyFromSource: processing creep ${creep.id}, source ${source.id}`; });
    var harvestAttempt = creep.harvest(source);
    if (harvestAttempt == ERR_NOT_IN_RANGE) {
        moveCreepToPosition(creep, source.pos);
    }
}

function giveResourceToStructureOrCreep(creep: Creep, target: Structure | Creep, resourceType: string) {
    log.debug(() => { return `creep.giveResourceToStructureOrCreep: processing creep ${creep.id}, target ${target.id}, resourceType ${resourceType}`; });
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
    log.debug(() => { return `creep.harvestEnergyFromSourceToCreepOrStructure: processing creep ${creep.id}, source ${source.id}, destination ${target.id}`; })
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