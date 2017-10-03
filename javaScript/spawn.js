"use strict";
var mopt = require("./option");
var SpawnWrapper = (function () {
    function SpawnWrapper(spawn, pv) {
        this.element = spawn;
        this.my = spawn.my;
        this.resourceRequests = [];
        var energyDemand = spawn.energyCapacity - spawn.energy;
        if (energyDemand > 0) {
            this.resourceRequests.push({
                requestorId: spawn.id,
                resourceType: RESOURCE_ENERGY,
                resourceRequestType: pv.PULL_REQUEST,
                amount: energyDemand,
                roomName: spawn.room.name,
                //isBlocker is used for checking if you need more transporters
                //spawn and extension energy becomes 0 suddenly rather than gradually
                //so you can't really use spawn or extension data to check if you need more transporters
                isBlocker: false
            });
        }
    }
    SpawnWrapper.prototype.process = function (pv) {
        var _this = this;
        if (!this.my) {
            pv.log(["spawn", "process", "spawn.process"], function () { return "spawn/SpawnWrapper.process: Skipping spawn " + _this.element.id; });
            return;
        }
        var me = this.element;
        var orderQueue = pv.getCreepOrders(me.room.name);
        var memory = pv.getSpawnMemory(me);
        var avblEnergy = me.room.energyAvailable;
        if (avblEnergy == memory.lastTickEnergy) {
            ++memory.ticksSinceLastDonation;
        }
        memory.lastTickEnergy = avblEnergy;
        var topOrder = mopt.None();
        if (avblEnergy >= 300 && pv.getMyCreepsByRoomAndType(me.room, pv.CREEP_TYPE_HARVESTER).length == 0) {
            var sources = pv.getMySources().filter(function (sw) { return sw.source.room.name == me.room.name; });
            if (sources.length > 0) {
                var source = sources[0].source;
                var order = pv.makeHarvesterOrder("emergencyHarvester", source.id);
                order.maxEnergy = avblEnergy;
                topOrder = mopt.Some(order);
            }
        }
        if (!topOrder.isPresent && avblEnergy >= 300 && pv.getMyCreepsByRoomAndType(me.room, pv.CREEP_TYPE_TRANSPORTER).length == 0) {
            var order = pv.makeTransporterOrder("emergencyTransporter");
            order.maxEnergy = avblEnergy;
            topOrder = mopt.Some(order);
        }
        if (!topOrder.isPresent)
            topOrder = orderQueue.peek();
        if (topOrder.isPresent && me.spawning == null) {
            var order_1 = topOrder.get;
            var minEnergy_1 = order_1.basicBody.map(function (bp) { return BODYPART_COST[bp]; }).reduce(function (p, c) { return p + c; }, 0);
            var maxEnergy = Math.min(me.room.energyCapacityAvailable, order_1.maxEnergy);
            //console.log("minEnergy, maxEnergy, avblEnergy, ticksSinceLastDonation = ", minEnergy, maxEnergy, avblEnergy, memory.ticksSinceLastDonation);
            if (avblEnergy >= minEnergy_1 && avblEnergy >= maxEnergy) {
                for (var x = 0; minEnergy_1 + BODYPART_COST[order_1.addOnBody[x]] <= Math.min(order_1.maxEnergy, avblEnergy); x = (x + 1) % order_1.addOnBody.length) {
                    order_1.basicBody.push(order_1.addOnBody[x]);
                    minEnergy_1 += BODYPART_COST[order_1.addOnBody[x]];
                }
                order_1.basicBody.sort(function (lbp, rbp) {
                    return pv.bodyPartPriority[lbp] - pv.bodyPartPriority[rbp];
                });
                pv.log(["spawn", "process", "spawn.process"], function () { return "spawn/SpawnWrapper.process: Spawn " + me.id + " scheduling " + order_1.basicBody + " for cost " + minEnergy_1; });
                var result_1 = me.createCreep(order_1.basicBody, order_1.name, order_1.memory);
                pv.log(["spawn", "process", "spawn.process"], function () { return "spawn/SpawnWrapper.process: with result " + result_1; });
            }
        }
    };
    SpawnWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from Spawn.");
    };
    SpawnWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, Math.min(amount, this.element.energyCapacity - this.element.energy));
    };
    return SpawnWrapper;
}());
function makeSpawnWrapper(spawn, pv) {
    return new SpawnWrapper(spawn, pv);
}
exports.makeSpawnWrapper = makeSpawnWrapper;
