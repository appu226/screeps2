"use strict";
var mopt = require("./option");
var SpawnWrapper = (function () {
    function SpawnWrapper(spawn) {
        this.element = spawn;
        this.my = spawn.my;
        this.resourceRequests = [];
    }
    SpawnWrapper.prototype.process = function (pv) {
        if (!this.my) {
            pv.log.debug("spawn.ts: Skipping spawn " + this.element.id);
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
            var order = topOrder.get;
            var minEnergy = order.basicBody.map(function (bp) { return BODYPART_COST[bp]; }).reduce(function (p, c) { return p + c; }, 0);
            var maxEnergy = Math.min(me.room.energyCapacityAvailable, order.maxEnergy);
            //console.log("minEnergy, maxEnergy, avblEnergy, ticksSinceLastDonation = ", minEnergy, maxEnergy, avblEnergy, memory.ticksSinceLastDonation);
            if (avblEnergy >= minEnergy && avblEnergy >= maxEnergy) {
                for (var x = 0; minEnergy + BODYPART_COST[order.addOnBody[x]] <= Math.min(order.maxEnergy, avblEnergy); x = (x + 1) % order.addOnBody.length) {
                    order.basicBody.push(order.addOnBody[x]);
                    minEnergy += BODYPART_COST[order.addOnBody[x]];
                }
                order.basicBody.sort(function (lbp, rbp) {
                    return pv.bodyPartPriority[lbp] - pv.bodyPartPriority[rbp];
                });
                pv.log.debug("Spawn " + me.id + " scheduling " + order.basicBody + " for cost " + minEnergy);
                var result = me.createCreep(order.basicBody, order.name, order.memory);
                pv.log.debug("with result " + result);
            }
        }
    };
    SpawnWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        throw new Error("Cannot take energy from Spawn.");
    };
    SpawnWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return SpawnWrapper;
}());
function makeSpawnWrapper(spawn) {
    return new SpawnWrapper(spawn);
}
exports.makeSpawnWrapper = makeSpawnWrapper;
