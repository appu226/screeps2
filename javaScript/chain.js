"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var functional = require("./functional");
var creepUtils = require("./creep");
var enums = require("./enums");
var eSpawn = { name: "Spawn" };
var eSource = { name: "Source" };
var eCreep = { name: "Creep" };
function createSourceToSpawnChain(sourceId, spawnId) {
    var source = Game.getObjectById(sourceId);
    if (source == null || source === undefined) {
        log.error(function () { return "chain/createSourceToSpawnChain: Could not find source with id " + sourceId; });
        return null;
    }
    var spawn = Game.getObjectById(spawnId);
    if (spawn == null || spawn === undefined) {
        log.error(function () { return "chain/createSourceToSpawnChain: Could not find spawn with id " + spawnId; });
        return null;
    }
    var sourceLinkName = "SourceLink" + memoryUtils.getUid().toString();
    var harvestorLinkName = "HarvestorLink";
    var spawnLinkName = "SpawnLink" + memoryUtils.getUid().toString();
    var harvestorLinkName = "HarvestorLink" + memoryUtils.getUid().toString();
    var sourceLink = {
        linkType: eSource,
        linkName: sourceLinkName,
        objectId: functional.Some(sourceId),
        sources: [],
        destinations: [harvestorLinkName]
    };
    var harvestorLink = {
        linkType: eCreep,
        linkName: harvestorLinkName,
        objectId: functional.None(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        creepType: creepUtils.eHarvester,
        status: "DEAD",
        creepName: functional.None()
    };
    var spawnLink = {
        linkType: eSpawn,
        linkName: spawnLinkName,
        objectId: functional.Some(spawnId),
        sources: [harvestorLinkName],
        destinations: []
    };
    return {
        creepGroupType: enums.eChain,
        creepGroupName: "Chain" + memoryUtils.getUid(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        links: [sourceLink, spawnLink, harvestorLink],
        spawnId: spawnId
    };
}
exports.createSourceToSpawnChain = createSourceToSpawnChain;
function mustRefreshChain(chain) {
    var mustRefresh = false;
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkType.name != eCreep.name) {
            continue;
        }
        var creepLink = link;
        switch (creepLink.status) {
            case "SPAWNING": {
                if (creepLink.creepName.isPresent == false) {
                    log.error(function () { return "chain/mustRefreshChain: spawning link " + creepLink.linkName + " does not have a creep name!"; });
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] !== undefined) {
                    creepLink.status = "ACTIVE";
                    creepLink.objectId = functional.Some(Game.creeps[creepName].id);
                    mustRefresh = true;
                }
                continue;
            }
            case "ACTIVE": {
                if (creepLink.creepName.isPresent == false) {
                    log.error(function () { return "chain/mustRefreshChain: active link " + creepLink.linkName + " does not have a creep name!"; });
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] === undefined) {
                    if (Memory.creeps[creepName] !== undefined)
                        (delete (Memory.creeps)[creepName]);
                    creepLink.status = "DEAD";
                    mustRefresh = true;
                }
                continue;
            }
            default:
                continue;
        }
    }
    return mustRefresh;
}
function bfs(current, linkMap, expand) {
    return functional.flatten(current.map(function (linkName) {
        var link = linkMap[linkName];
        if (link.linkType.name != eCreep.name)
            return [linkName];
        var creepLink = link;
        if (creepLink.status == "ACTIVE")
            return [linkName];
        return bfs(expand(linkName), linkMap, expand);
    }));
}
function linkTypeToCreepTargetType(linkType) {
    switch (linkType.name) {
        case eSpawn.name: return creepUtils.eSpawn;
        case eSource.name: return creepUtils.eSource;
        case eCreep.name: return creepUtils.eCreep;
        default: {
            log.error(function () { return "chain/linkTypeToCreepTargetType: unexpected link type " + linkType.name; });
            return { targetType: "NA" };
        }
    }
}
function updateCreepMemory(creep, link, linkMap) {
    var sources = bfs(link.sources, linkMap, function (linkName) { return linkMap[linkName].sources; }).map(function (sourceLinkName) {
        return {
            targetType: linkTypeToCreepTargetType(linkMap[sourceLinkName].linkType),
            targetId: linkMap[sourceLinkName].objectId.get
        };
    });
    var destinations = bfs(link.destinations, linkMap, function (linkName) { return linkMap[linkName].destinations; }).map(function (destLinkName) {
        return {
            targetType: linkTypeToCreepTargetType(linkMap[destLinkName].linkType),
            targetId: linkMap[destLinkName].objectId.get
        };
    });
    creep.memory = creepUtils.makeCreepMemory(link.creepType, sources, destinations);
}
function refreshGroup(group, forceRefresh) {
    if (forceRefresh === void 0) { forceRefresh = false; }
    if (group.creepGroupType.name != enums.eChain.name)
        return;
    var chain = group;
    if (!mustRefreshChain(chain) && !forceRefresh)
        return;
    var linkMap = {};
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        linkMap[chain.links[linkIdx].linkName] = chain.links[linkIdx];
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkType.name != eCreep.name) {
            continue;
        }
        var creepLink = link;
        if (creepLink.status != "ACTIVE") {
            continue;
        }
        if (!creepLink.creepName.isPresent) {
            log.error(function () { return "chain/refreshChain: link " + creepLink.linkName + " is ACTIVE but has empty creepName"; });
            continue;
        }
        var creep = Game.creeps[creepLink.creepName.get];
        creepLink.objectId = functional.Some(creep.id);
        updateCreepMemory(creep, creepLink, linkMap);
    }
}
exports.refreshGroup = refreshGroup;
function creepToBeSpawned(chain, energy) {
    var deadLink = null;
    for (var linkNum = 0; linkNum < chain.links.length && deadLink == null; ++linkNum) {
        var link = chain.links[linkNum];
        if (link.linkType.name == eCreep.name && link.status == "DEAD")
            deadLink = link;
    }
    if (deadLink == null)
        return functional.None();
    else {
        var bodyParts = creepUtils.createBodyParts(deadLink.creepType, energy);
        deadLink.creepName = functional.Some(deadLink.creepType.creepType + memoryUtils.getUid());
        deadLink.status = "SPAWNING";
        var memory = creepUtils.makeCreepMemory(deadLink.creepType, [], []);
        return functional.Some({
            creepName: deadLink.creepName.get,
            bodyParts: bodyParts,
            creepMemory: memory
        });
    }
}
exports.creepToBeSpawned = creepToBeSpawned;
function addCreep(chain, creepType, sourceLinkNames, destinationLinkNames) {
    var newLinkName = "Link" + creepType.creepType + memoryUtils.getUid();
    chain.links.forEach(function (chainLink) {
        //if it is in sourceLinkNames
        if (functional.contains(sourceLinkNames, chainLink.linkName)) {
            //remove all it's destinations that are in destinationLinkNames
            chainLink.destinations = chainLink.destinations.filter(function (chainLinkDestination) { return functional.contains(destinationLinkNames, chainLinkDestination); });
            //add newLinkName as a destinations
            chainLink.destinations.push(newLinkName);
        }
        //if it is in destinationLinkNames
        if (functional.contains(destinationLinkNames, chainLink.linkName)) {
            //remove all it's sources that are in sourceLinkNames
            chainLink.sources = chainLink.sources.filter(function (chainLinkSource) { return functional.contains(sourceLinkNames, chainLinkSource); });
            //add newLinkName as a source
            chainLink.sources.push(newLinkName);
        }
    });
    var newLink = {
        creepType: creepType,
        status: "DEAD",
        creepName: functional.None(),
        linkType: eCreep,
        linkName: newLinkName,
        objectId: functional.None(),
        sources: sourceLinkNames,
        destinations: destinationLinkNames
    };
    chain.links.push(newLink);
    refreshGroup(chain, true);
}
exports.addCreep = addCreep;
