import functional = require('./functional');
import memoryUtils = require('./memory');

export function collectedEnergy(sources: Source[]): number {
    return functional.sum(
        sources.map(
            function(source) {
                var ec = memoryUtils.sourceMemory(source).energyCollection;
                // scale to 300 to match total capacity computation
                return ec.total / ec.history.length * 300;
            }
        )
    );
}
export function totalCapacity(sources: Source[]): number {
    return functional.sum(
        sources.map(
            function(source) { 
                return Game.getObjectById<Source>(source.id).energyCapacity;    
            }
        )
    );
}

export var timeToRegeneration = 300;
