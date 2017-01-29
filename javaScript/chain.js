"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var fun = require("./functional");
var cu = require("./creep");
var enums = require("./enums");
var eSpawn = { name: "Spawn" };
var eSource = { name: "Source" };
var eCreep = { name: "Creep" };
var eController = { name: "Controller" };
var eDead = { status: "Dead" };
var eSpawning = { status: "Spawning" };
var eActive = { status: "Active" };
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
        objectId: fun.Some(sourceId),
        sources: [],
        destinations: [harvestorLinkName]
    };
    var harvestorLink = {
        linkType: eCreep,
        linkName: harvestorLinkName,
        objectId: fun.None(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        creepType: cu.eHarvester,
        status: eDead,
        creepName: fun.None()
    };
    var spawnLink = {
        linkType: eSpawn,
        linkName: spawnLinkName,
        objectId: fun.Some(spawnId),
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
        switch (creepLink.status.status) {
            case eSpawning.status: {
                if (creepLink.creepName.isPresent == false) {
                    log.error(function () { return "chain/mustRefreshChain: spawning link " + creepLink.linkName + " does not have a creep name!"; });
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] !== undefined && Game.creeps[creepName].id !== undefined) {
                    creepLink.status = eActive;
                    creepLink.objectId = fun.Some(Game.creeps[creepName].id);
                    mustRefresh = true;
                }
                continue;
            }
            case eActive.status: {
                if (creepLink.creepName.isPresent == false) {
                    log.error(function () { return "chain/mustRefreshChain: active link " + creepLink.linkName + " does not have a creep name!"; });
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] === undefined) {
                    if (Memory.creeps[creepName] !== undefined)
                        (delete (Memory.creeps)[creepName]);
                    creepLink.status = eDead;
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
    return fun.flatten(current.map(function (linkName) {
        var link = linkMap[linkName];
        if (link.linkType.name != eCreep.name)
            return [linkName];
        var creepLink = link;
        if (creepLink.status.status == eActive.status)
            return [linkName];
        return bfs(expand(linkName), linkMap, expand);
    }));
}
function linkTypeToCreepTargetType(linkType) {
    switch (linkType.name) {
        case eSpawn.name: return cu.eSpawn;
        case eSource.name: return cu.eSource;
        case eCreep.name: return cu.eCreep;
        case eController.name: return cu.eController;
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
    creep.memory = cu.makeCreepMemory(link.creepType, sources, destinations);
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
        if (creepLink.status.status != eActive.status) {
            continue;
        }
        if (!creepLink.creepName.isPresent) {
            log.error(function () { return "chain/refreshChain: link " + creepLink.linkName + " is ACTIVE but has empty creepName"; });
            continue;
        }
        var creep = Game.creeps[creepLink.creepName.get];
        creepLink.objectId = fun.Some(creep.id);
        updateCreepMemory(creep, creepLink, linkMap);
    }
}
exports.refreshGroup = refreshGroup;
function creepToBeSpawned(chain, energy) {
    var deadLink = null;
    for (var linkNum = 0; linkNum < chain.links.length && deadLink == null; ++linkNum) {
        var link = chain.links[linkNum];
        if (link.linkType.name == eCreep.name && link.status.status == eDead.status)
            deadLink = link;
    }
    if (deadLink == null)
        return fun.None();
    else {
        var bodyParts = cu.createBodyParts(deadLink.creepType, energy);
        deadLink.creepName = fun.Some(deadLink.creepType.creepType + memoryUtils.getUid());
        deadLink.status = eSpawning;
        return fun.Some({
            creepName: deadLink.creepName.get,
            bodyParts: bodyParts
        });
    }
}
exports.creepToBeSpawned = creepToBeSpawned;
function addCreep(chain, creepType, sourceLinkNames, destinationLinkNames) {
    var newLinkName = "Link" + creepType.creepType + memoryUtils.getUid();
    chain.links.forEach(function (chainLink) {
        //if it is in sourceLinkNames
        if (fun.contains(sourceLinkNames, chainLink.linkName)) {
            //remove all it's destinations that are in destinationLinkNames
            chainLink.destinations = chainLink.destinations.filter(function (chainLinkDestination) { return !fun.contains(destinationLinkNames, chainLinkDestination); });
            //add newLinkName as a destinations
            chainLink.destinations.push(newLinkName);
        }
        //if it is in destinationLinkNames
        if (fun.contains(destinationLinkNames, chainLink.linkName)) {
            //remove all it's sources that are in sourceLinkNames
            chainLink.sources = chainLink.sources.filter(function (chainLinkSource) { return !fun.contains(sourceLinkNames, chainLinkSource); });
            //add newLinkName as a source
            chainLink.sources.push(newLinkName);
        }
    });
    var newLink = {
        creepType: creepType,
        status: eDead,
        creepName: fun.None(),
        linkType: eCreep,
        linkName: newLinkName,
        objectId: fun.None(),
        sources: sourceLinkNames,
        destinations: destinationLinkNames
    };
    chain.links.push(newLink);
    refreshGroup(chain, true);
    return newLinkName;
}
exports.addCreep = addCreep;
function createLink(objId, objType, creepType) {
    switch (objType.targetType) {
        case cu.eCreep.targetType: {
            if (!creepType.isPresent) {
                log.error(function () { return "chain/createLink: creepType empty while creating link for " + objId; });
                return null;
            }
            var creep = Game.getObjectById(objId);
            if (creep == null || creep === undefined) {
                log.error(function () { return "chain/createLink: could not find creep with id " + objId; });
                return null;
            }
            var creepLink = {
                linkType: eCreep,
                linkName: "CreepLink" + memoryUtils.getUid(),
                objectId: fun.Some(objId),
                creepType: creepType.get,
                status: eActive,
                creepName: fun.Some(creep.name),
                sources: [],
                destinations: []
            };
            return creepLink;
        }
        case cu.eSource.targetType: {
            var sourceLink = {
                linkType: eSource,
                linkName: "LinkSource" + memoryUtils.getUid(),
                objectId: fun.Some(objId),
                sources: [],
                destinations: []
            };
            return sourceLink;
        }
        case cu.eSpawn.targetType: {
            var spawnLink = {
                linkType: eSpawn,
                linkName: "LinkSpawn" + memoryUtils.getUid(),
                objectId: fun.Some(objId),
                sources: [],
                destinations: []
            };
            return spawnLink;
        }
        case cu.eController.targetType: {
            var controllerLink = {
                linkType: eController,
                linkName: "LinkController" + memoryUtils.getUid(),
                objectId: fun.Some(objId),
                sources: [],
                destinations: []
            };
            return controllerLink;
        }
        default: {
            log.error(function () { return "chain/createLink: objType " + objType.targetType + " not supported."; });
        }
    }
}
function createChain(sourceId, sourceType, targetId, targetType, spawnId, sourceCreepType, targetCreepType) {
    if (sourceCreepType === void 0) { sourceCreepType = fun.None(); }
    if (targetCreepType === void 0) { targetCreepType = fun.None(); }
    var source = createLink(sourceId, sourceType, sourceCreepType);
    if (source == null)
        return null;
    var destination = createLink(targetId, targetType, targetCreepType);
    if (destination == null)
        return null;
    source.destinations = [destination.linkName];
    destination.sources = [source.linkName];
    var chain = {
        creepGroupType: enums.eChain,
        creepGroupName: "Chain" + memoryUtils.getUid(),
        sources: [source.linkName],
        destinations: [destination.linkName],
        links: [source, destination],
        spawnId: spawnId
    };
    return chain;
}
exports.createChain = createChain;
