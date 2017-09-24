"use strict";
function makeClaimerOrder(orderName, roomName, roomPath, pv) {
    return {
        creepType: pv.CREEP_TYPE_CLAIMER,
        name: pv.CREEP_TYPE_CLAIMER + "_" + pv.getUid(),
        orderName: orderName,
        basicBody: [MOVE, CLAIM, MOVE, WORK, MOVE, CARRY],
        addOnBody: [MOVE, MOVE, WORK, CARRY],
        maxEnergy: 5000,
        memory: makeClaimerMemory(roomName, roomPath, pv)
    };
}
exports.makeClaimerOrder = makeClaimerOrder;
function makeClaimerMemory(targetRoom, roomPath, pv) {
    return {
        targetRoom: targetRoom,
        roomPath: roomPath,
        spawnConstructionSiteId: "",
        sourceId: "",
        creepType: pv.CREEP_TYPE_CLAIMER,
        efficiencies: {
            pushStack: [],
            popStack: []
        },
        totalEfficiency: 0,
        lastX: -1,
        lastY: -1,
        lastTimeOfMoveAttempt: -1
    };
}
var ClaimerCreepWrapper = (function () {
    function ClaimerCreepWrapper(creep, pv) {
        this.element = creep;
        this.creepType = pv.CREEP_TYPE_CLAIMER;
        this.memory = creep.memory;
        this.resourceRequests = [];
    }
    ClaimerCreepWrapper.prototype.process = function (pv) {
        var creep = this.element;
        var mem = this.memory;
        if (creep.room.name == mem.targetRoom) {
            var room = creep.room;
            if (!room.controller.my) {
                if (creep.claimController(room.controller) == ERR_NOT_IN_RANGE)
                    pv.moveCreep(this, room.controller.pos);
            }
            else if (room.controller.ticksToDowngrade < 1000) {
                var distanceToController = pv.manhattan(creep.pos, room.controller.pos);
                var source = this.getSource(pv);
                var distanceToSource = pv.manhattan(creep.pos, source.pos);
                var controllerIsCloser = distanceToController < distanceToSource;
                var isEmpty = pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0;
                var isFull = pv.availableSpace(creep.carry, creep.carryCapacity) == 0;
                if (isEmpty || (!isFull && !controllerIsCloser)) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, source.pos);
                }
                else {
                    if (creep.upgradeController(room.controller) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, room.controller.pos);
                }
            }
            else if (pv.getMyStructuresByRoomAndType(room, STRUCTURE_SPAWN).length > 0) {
                return;
            }
            else if (pv.getConstructionSitesFromRoomOfType(room, STRUCTURE_SPAWN).length == 0) {
                pv.constructNextSite(room, STRUCTURE_SPAWN);
            }
            else {
                var cs = pv.getConstructionSitesFromRoomOfType(room, STRUCTURE_SPAWN)[0];
                var distanceToCs = pv.manhattan(creep.pos, cs.pos);
                var source = this.getSource(pv);
                var distanceToSource = pv.manhattan(creep.pos, source.pos);
                var isEmpty = pv.resourceAmount(creep.carry, RESOURCE_ENERGY) == 0;
                var isFull = pv.availableSpace(creep.carry, creep.carryCapacity) == 0;
                var sourceIsCloser = distanceToSource < distanceToCs;
                if (isEmpty || (!isFull && sourceIsCloser)) {
                    if (creep.harvest(source) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, source.pos);
                }
                else {
                    if (creep.build(cs) == ERR_NOT_IN_RANGE)
                        pv.moveCreep(this, cs.pos);
                }
            }
        }
        else {
            var nextRoom = "";
            for (var i = 1; i < mem.roomPath.length; ++i)
                if (mem.roomPath[i - 1] == creep.room.name)
                    nextRoom = mem.roomPath[i];
            if (nextRoom == "")
                throw new Error("claimer/ClaimerCreepWrapper.process: Creep " + creep.name + " does not know which room to go to after " + creep.room.name);
            var exitopp = pv.map.describeExits(creep.room.name);
            var exits = {};
            for (var x in exitopp)
                exits[exitopp[x]] = parseInt(x);
            if (exits[nextRoom] === undefined || exits[nextRoom] == null)
                throw new Error("claimer/ClaimerCreepWrpper.process: Could not find exit to " + nextRoom + " from " + creep.room.name);
            var nrrp = creep.pos.findClosestByPath(exits[nextRoom]);
            pv.moveCreep(this, nrrp);
        }
    };
    ClaimerCreepWrapper.prototype.getSource = function (pv) {
        var src = pv.game.getObjectById(this.memory.sourceId);
        if (src == null) {
            var closest = this.element.pos.findClosestByRange(FIND_SOURCES_ACTIVE);
            this.memory.sourceId = closest.id;
            return closest;
        }
        return src;
    };
    ClaimerCreepWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return this.element.transfer(creep, resourceType, amount);
    };
    ClaimerCreepWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return ClaimerCreepWrapper;
}());
exports.ClaimerCreepWrapper = ClaimerCreepWrapper;
