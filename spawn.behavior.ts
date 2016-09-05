import functional = require('./functional');
import sourceUtils = require('./utils.source');


export function process(spawn: StructureSpawn): void {
    console.log("TBI: spawn.behavior.process " + spawn.name);
    if (spawn.energy < spawn.energyCapacity) {
        return;
    }
    var actualCollected = sourceUtils.collectedEnergy(spawn.memory.sortedSources);
    var totalCapacity = sourceUtils.totalCapacity(spawn.memory.sortedSources);
            
    //until 33% capacity, focus on harvesting
    //console.log("spawn.behavior.process actualCollected " + actualCollected + ", totalCapacity " + totalCapacity);
    if (actualCollected < totalCapacity * .33) {
        return this.buildHarvesterOrTransporter(spawn);
    }
}
    
/**
 * @Param {StructureSpawn} spawn
 */
export function buildHarvesterOrTransporter(spawn: StructureSpawn): void {
    console.log("TBI: spawn.behavior.buildHarvesterOrTransporter");
}