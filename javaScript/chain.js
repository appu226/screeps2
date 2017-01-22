"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var functional = require("./functional");
var creepUtils = require("./creep");
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
        linkType: "SOURCE",
        linkName: sourceLinkName,
        objectId: functional.Some(sourceId),
        sources: [],
        destinations: [harvestorLinkName]
    };
    var harvestorLink = {
        linkType: "CREEP",
        linkName: harvestorLinkName,
        objectId: functional.None(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        action: "HARVEST",
        status: "DEAD",
        creepName: functional.None()
    };
    var spawnLink = {
        linkType: "SPAWN",
        linkName: spawnLinkName,
        objectId: functional.Some(spawnId),
        sources: [harvestorLinkName],
        destinations: []
    };
    return {
        creepGroupType: "CHAIN",
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
        if (link.linkType != "CREEP") {
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
        if (link.linkType != "CREEP")
            return [linkName];
        var creepLink = link;
        if (creepLink.status == "ACTIVE")
            return [linkName];
        return bfs(expand(linkName), linkMap, expand);
    }));
}
function updateCreepMemory(creep, link, linkMap) {
    var sources = bfs(link.sources, linkMap, function (linkName) { return linkMap[linkName].sources; }).map(function (sourceLinkName) {
        return {
            targetType: linkMap[sourceLinkName].linkType,
            targetId: linkMap[sourceLinkName].objectId.get
        };
    });
    var destinations = bfs(link.destinations, linkMap, function (linkName) { return linkMap[linkName].destinations; }).map(function (destLinkName) {
        return {
            targetType: linkMap[destLinkName].linkType,
            targetId: linkMap[destLinkName].objectId.get
        };
    });
    creep.memory = creepUtils.makeCreepMemory(link.action, sources, destinations);
}
function refreshChain(chain) {
    if (!mustRefreshChain(chain))
        return;
    var linkMap = {};
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        linkMap[chain.links[linkIdx].linkName] = chain.links[linkIdx];
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkType != "CREEP") {
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
exports.refreshChain = refreshChain;
function creepToBeSpawned(chain, energy) {
    var deadLink = null;
    for (var linkNum = 0; linkNum < chain.links.length && deadLink == null; ++linkNum) {
        var link = chain.links[linkNum];
        if (link.linkType == "CREEP" && link.status == "DEAD")
            deadLink = link;
    }
    if (deadLink == null)
        return functional.None();
    else {
        var bodyParts = creepUtils.createBodyParts(deadLink.action, energy);
        deadLink.creepName = functional.Some(deadLink.action + memoryUtils.getUid());
        deadLink.status = "SPAWNING";
        var memory = creepUtils.makeCreepMemory(deadLink.action, [], []);
        return functional.Some({
            creepName: deadLink.creepName.get,
            bodyParts: bodyParts,
            creepMemory: memory
        });
    }
}
exports.creepToBeSpawned = creepToBeSpawned;
function addCreep(chain, action, sourceLinkNames, destinationLinkNames) {
    var newLinkName = "Link" + action + memoryUtils.getUid();
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
        action: action,
        status: "DEAD",
        creepName: functional.None(),
        linkType: "CREEP",
        linkName: newLinkName,
        objectId: functional.None(),
        sources: sourceLinkNames,
        destinations: destinationLinkNames
    };
    chain.links.push(newLink);
}
exports.addCreep = addCreep;
