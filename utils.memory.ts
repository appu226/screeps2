
export function sourceMemory(source: Source) {
    //console.log("utils.memory.sourceMemory for source " + source.id);
    if (Memory.sourceMemory === undefined) {
        Memory.sourceMemory = {};
    }
    if (Memory.sourceMemory[source.id] === undefined) {
        Memory.sourceMemory[source.id] = {
            energyCollection: {
                total: 0,
                history: [0]
            }
        };
    }
    return Memory.sourceMemory[source.id];
};