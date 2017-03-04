import map = require('./map');
import fun = require('./functional');
import cu = require('./creep');
import mu = require('./memory');
import enums = require('./enums');

const forgetfulnessOfWar = Math.pow(.5, .01); // become half in 100 ticks
const dominationFactor = 1.2; // by what factor do you dominate foreign attackers
const ninjaBody = [MOVE, HEAL, MOVE, ATTACK, MOVE, RANGED_ATTACK, MOVE, TOUGH];
const ninjaCost = fun.sum(ninjaBody.map<number>(bodyPart => BODYPART_COST[bodyPart]));

export interface Squadron extends CreepGroup {
    roomName: string;
    regroupPos: map.XY;
    maxAttackStrength: number;
    activeCreepNames: string[];
    regroupingCreepNames: string[];
}

function aliveCreeps(names: string[]): Creep[] {
    return names.map<Creep>(
        creepName => Game.creeps[creepName]
    ).filter(
        value => value != null && value !== undefined
        );
}

function attackStrength(creep: Creep): number {
    return creep.getActiveBodyparts(ATTACK) * 30 + creep.getActiveBodyparts(RANGED_ATTACK) * 20 + creep.getActiveBodyparts(HEAL) * 12;
}

export function refreshGroup(squadron: Squadron): number {
    var activeCreeps = aliveCreeps(squadron.activeCreepNames);
    squadron.activeCreepNames = activeCreeps.map<string>(creep => creep.name);
    var activeAttackStrength: number = fun.sum(activeCreeps.map<number>(attackStrength));

    var regroupingCreeps = aliveCreeps(squadron.regroupingCreepNames);
    squadron.regroupingCreepNames = regroupingCreeps.map<string>(creep => creep.name);
    var regroupingAttackStrength: number = fun.sum(regroupingCreeps.map<number>(attackStrength));

    var activeNinjaMemory = cu.makeActiveNinjaMemory(squadron.roomName);
    var regroupingNinjaMemory = cu.makeRegroupingNinjaMemory(squadron.regroupPos);
    squadron.activeCreepNames.forEach((creepName: string) => {
        Game.creeps[creepName].memory = activeNinjaMemory;
    });
    squadron.regroupingCreepNames.forEach((creepName: string) => {
        Game.creeps[creepName].memory = regroupingNinjaMemory;
    });
    return activeAttackStrength + regroupingAttackStrength;
}

export function creepToBeSpawned(squadron: Squadron, energy: number): fun.Option<cu.CreepToBeSpawned> {
    if (energy < ninjaCost)
        return fun.None<cu.CreepToBeSpawned>();
    var myAttackStrength = refreshGroup(squadron);

    squadron.maxAttackStrength =
        Math.max(
            squadron.maxAttackStrength * (
                Game.rooms[squadron.roomName] === undefined || Game.rooms[squadron.roomName] == null
                    ? 1 // if you can't see the room, assume it's as militarized as you last observed
                    : forgetfulnessOfWar // even if you can see the room, keep some memory of the previously observed militarization
            ),
            fun.sum(map.foreignAttackers(squadron.roomName).map(attackStrength)) * dominationFactor
        );

    var res: fun.Option<cu.CreepToBeSpawned> = fun.None<cu.CreepToBeSpawned>();
    if (myAttackStrength >= squadron.maxAttackStrength) {
        squadron.activeCreepNames = squadron.activeCreepNames.concat(squadron.regroupingCreepNames);
        squadron.regroupingCreepNames = [];
    } else {
        var bp = cu.createBodyPartsImpl(ninjaBody, energy);
        var creepName = `Ninja${mu.getUid()}`;
        res = fun.Some<cu.CreepToBeSpawned>({
            creepName: creepName,
            bodyParts: bp,
            registerSuccess: () => {
                squadron.regroupingCreepNames.push(creepName);
            }
        });
    }
    return res;
}

export function makeSquadron(roomName: string, regroupX: number, regroupY: number, spawnId: string): string {
    var name = `Squadron${mu.getUid()}`;
    var squadron: Squadron = {
        creepGroupType: enums.eSquadron,
        creepGroupName: name,
        spawnId: spawnId,
        roomName: roomName,
        regroupPos: { x: regroupX, y: regroupY },
        maxAttackStrength: 0,
        activeCreepNames: [],
        regroupingCreepNames: []
    }
    mu.enrichedMemory().creepGroups.push(squadron);
    return name;
}
