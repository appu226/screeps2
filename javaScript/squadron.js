"use strict";
var map = require("./map");
var fun = require("./functional");
var cu = require("./creep");
var mu = require("./memory");
var enums = require("./enums");
var forgetfulnessOfWar = Math.pow(.5, .025); // become half in 40 ticks
var dominationFactor = 1.2; // by what factor do you dominate foreign attackers
var ninjaBody = [MOVE, HEAL, MOVE, ATTACK, MOVE, RANGED_ATTACK, MOVE, TOUGH];
var ninjaCost = fun.sum(ninjaBody.map(function (bodyPart) { return BODYPART_COST[bodyPart]; }));
function aliveCreeps(names) {
    return names.map(function (creepName) { return Game.creeps[creepName]; }).filter(function (value) { return value != null && value !== undefined; });
}
function attackStrength(creep) {
    return creep.getActiveBodyparts(ATTACK) * 30 + creep.getActiveBodyparts(RANGED_ATTACK) * 20 + creep.getActiveBodyparts(HEAL) * 12;
}
function creepToBeSpawned(squadron, energy) {
    if (energy < ninjaCost)
        return fun.None();
    var activeCreeps = aliveCreeps(squadron.activeCreepNames);
    squadron.activeCreepNames = activeCreeps.map(function (creep) { return creep.name; });
    var activeAttackStrength = fun.sum(activeCreeps.map(attackStrength));
    var regroupingCreeps = aliveCreeps(squadron.regroupingCreepNames);
    squadron.regroupingCreepNames = regroupingCreeps.map(function (creep) { return creep.name; });
    var regroupingAttackStrength = fun.sum(regroupingCreeps.map(attackStrength));
    squadron.maxAttackStrength =
        Math.max(squadron.maxAttackStrength * forgetfulnessOfWar, fun.sum(map.foreignAttackers(squadron.roomName).map(attackStrength)) * dominationFactor);
    var res = fun.None();
    if (activeAttackStrength + regroupingAttackStrength >= squadron.maxAttackStrength) {
        squadron.activeCreepNames = squadron.activeCreepNames.concat(squadron.regroupingCreepNames);
        squadron.regroupingCreepNames = [];
    }
    else {
        var bp = cu.createBodyPartsImpl(ninjaBody, energy);
        var creepName = "Ninja" + mu.getUid();
        res = fun.Some({
            creepName: creepName,
            bodyParts: bp,
            registerSuccess: function () {
                squadron.regroupingCreepNames.push(creepName);
            }
        });
    }
    var activeNinjaMemory = cu.makeActiveNinjaMemory(squadron.roomName);
    var regroupingNinjaMemory = cu.makeRegroupingNinjaMemory(squadron.regroupPos);
    squadron.activeCreepNames.forEach(function (creepName) {
        Game.creeps[creepName].memory = activeNinjaMemory;
    });
    squadron.regroupingCreepNames.forEach(function (creepName) {
        Game.creeps[creepName].memory = regroupingNinjaMemory;
    });
    return res;
}
exports.creepToBeSpawned = creepToBeSpawned;
function makeSquadron(roomName, regroupX, regroupY, spawnId) {
    var name = "Squadron" + mu.getUid();
    var squadron = {
        creepGroupType: enums.eSquadron,
        creepGroupName: name,
        spawnId: spawnId,
        roomName: roomName,
        regroupPos: { x: regroupX, y: regroupY },
        maxAttackStrength: 0,
        activeCreepNames: [],
        regroupingCreepNames: []
    };
    mu.enrichedMemory().creepGroups.push(squadron);
    return name;
}
exports.makeSquadron = makeSquadron;
