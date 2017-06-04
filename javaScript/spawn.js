"use strict";
var SpawnWrapper = (function () {
    function SpawnWrapper(spawn) {
        this.structure = spawn;
        this.my = spawn.my;
    }
    SpawnWrapper.prototype.process = function (pv) {
        if (!this.my) {
            pv.log.debug("spawn.ts: Skipping spawn " + this.structure.id);
            return;
        }
        var me = this.structure;
        var orderQueue = pv.getCreepOrders(me.room.name);
        var topOrder = orderQueue.peek();
        if (topOrder.isPresent) {
            var order = topOrder.get;
            var minEnergy = order.basicBody.map(function (bp) { return BODYPART_COST[bp]; }).reduce(function (p, c) { return p + c; }, 0);
            var avblEnergy = me.room.energyAvailable;
            if (avblEnergy >= minEnergy) {
                for (var x = 0; minEnergy + BODYPART_COST[order.addOnBody[x]] <= Math.min(order.maxEnergy, avblEnergy); x = (x + 1) % order.addOnBody.length) {
                    order.basicBody.push(order.addOnBody[x]);
                }
                order.basicBody.sort(function (lbp, rbp) {
                    return pv.bodyPartPriority[lbp] - pv.bodyPartPriority[rbp];
                });
                pv.log.debug("Spawn " + me.id + " scheduling " + order.basicBody + " for cost " + minEnergy);
                var result = me.createCreep(order.basicBody, order.name, order.memory);
                pv.log.debug("with result " + result);
            }
        }
        pv.requestResourceReceive(this.structure.room.name, this.structure.id, false, RESOURCE_ENERGY, this.structure.energyCapacity - this.structure.energy);
    };
    return SpawnWrapper;
}());
function makeSpawnWrapper(spawn) {
    return new SpawnWrapper(spawn);
}
exports.makeSpawnWrapper = makeSpawnWrapper;
