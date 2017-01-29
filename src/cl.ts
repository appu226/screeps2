import memoryUtils = require('./memory');
import log = require('./log');
import fun = require('./functional');
import chain = require('./chain');
import cu = require('./creep');
import enums = require('./enums');

function createChain(
    sourceId: string, sourceType: cu.ETargetType,
    targetId: string, targetType: cu.ETargetType,
    spawnId: string,
    sourceCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>(),
    targetCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>()
) {
    var chn = chain.createChain(
        sourceId, sourceType,
        targetId, targetType,
        spawnId,
        sourceCreepType, targetCreepType);
    if (chn != null)
        memoryUtils.enrichedMemory().creepGroups.push(chn);
}

function addNonCreepLink(
    chainName: string,
    target: cu.Target,
    isSource: Boolean,
    isDestination: Boolean
): string {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addNonCreep(<chain.Chain>creepGroup, target, isSource, isDestination);
        }
    }
}

function addCreep(
    chainName: string,
    creepType: cu.ECreepType,
    sourceLinkNames: string[],
    destinationLinkNames: string[]
): string {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addCreep(<chain.Chain>creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}

export function executeCustomCommand() {
    var nextCommandNumber = 15;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(() => `Executing command ${nextCommandNumber}`)
        // var transporterLinkName = addCreep("Chain3", cu.eTransporter, ["HarvestorLink2"], ["SpawnLink1"]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);
        // addCreep("Chain3", cu.eHarvester, ["SourceLink0"], [transporterLinkName]);

        // var controllerName = addNonCreepLink("Chain3", { targetType: cu.eController, targetId: "5836b6ae8b8b9619519ef1eb" }, false, true);
        // var source2Name = addNonCreepLink("Chain3", { targetType: cu.eSource, targetId: "5836b6ae8b8b9619519ef1ea" }, true, false);
        // var harvestor = addCreep("Chain3", cu.eHarvester, [source2Name], [controllerName]);
        // var updator = addCreep("Chain3", cu.eUpdater, [harvestor], [controllerName]);
        // var transporter = addCreep("Chain3", cu.eTransporter, [harvestor], [updator]);
        // var spawn = Game.spawns["Spawn1"];
        // spawn.createCreep(
        //     cu.createBodyParts(cu.eTransporter, spawn.energy),
        //     "Transporter18",
        //     cu.makeCreepMemory(
        //         cu.eUpdater,
        //         [{ targetType: cu.eCreep, targetId: "588d95f462b19a2f5dd70931" }],
        //         [{ targetType: cu.eCreep, targetId: "588d996ca105e832025a80d7" }]
        //     )
        // );

        // var crossLink = addCreep("Chain3", cu.eTransporter, ["LinkTransporter5"], ["LinkUpdater14"]);
        // addCreep("Chain3", cu.eTransporter, ["LinkTransporter5"], ["LinkTransporter19"]);
        // addCreep("Chain3", cu.eUpdater, ["LinkTransporter15", "LinkTransporter19"], ["LinkController11"]);

        // addCreep("Chain3", cu.eTransporter, ["LinkTransporter21"], ["LinkTransporter19"]);
        // addCreep("Chain3", cu.eBuilder, ["LinkTransporter21"], ["SpawnLink1"]);
        // var pos = new RoomPosition(8, 17, "W75S2");
        // pos.createConstructionSite(STRUCTURE_ROAD);

        // var roomName = "W75S2";
        // var allPos: RoomPosition[] = [];
        // var pathStart = new RoomPosition(19, 38, roomName);
        // var pathEnd = new RoomPosition(24, 47, roomName);
        // allPos.push(pathStart)
        // allPos.push(pathEnd);
        // var shortestPath = pathStart.findPathTo(pathEnd, {ignoreCreeps: true});
        // for (var spi = 0; spi < shortestPath.length; ++spi) {
        //     allPos.push(new RoomPosition(shortestPath[spi].x, shortestPath[spi].y, roomName));
        // }
        // for (var api = 0; api < allPos.length; ++api) {
        //     allPos[api].createConstructionSite(STRUCTURE_ROAD);
        // }

        // for (var y = 44; y < 47; ++y) {
        //     (new RoomPosition(24, y, roomName)).createConstructionSite(STRUCTURE_ROAD);
        // }

        log.info(() => `Successfully executed command ${nextCommandNumber}`);
    }
}