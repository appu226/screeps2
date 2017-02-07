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
var eTower = { name: "Tower" };
var eExtension = { name: "Extension" };
var eContainer = { name: "Container" };
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
        case eTower.name: return cu.eTower;
        case eExtension.name: return cu.eExtension;
        case eContainer.name: return cu.eContainer;
        default: {
            log.error(function () { return "chain/linkTypeToCreepTargetType: unexpected link type " + linkType.name; });
            return { targetType: "NA" };
        }
    }
}
function creepTargetTypeToLinkType(targetType) {
    switch (targetType.targetType) {
        case cu.eSpawn.targetType: return eSpawn;
        case cu.eSource.targetType: return eSource;
        case cu.eCreep.targetType: return eCreep;
        case cu.eController.targetType: return eController;
        case cu.eTower.targetType: return eTower;
        case cu.eExtension.targetType: return eExtension;
        case cu.eContainer.targetType: return eContainer;
        default: {
            log.error(function () { return "chain/creepTargetTypeToLinkType: unexpected creep target type " + targetType.targetType; });
            return { name: "NA" };
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
function verifyLinkNames(chain, linkNames) {
    var validNames = chain.links.map(function (link) { return link.linkName; });
    return linkNames.reduce(function (previousValue, currentValue) {
        return previousValue && fun.contains(validNames, currentValue);
    }, true);
}
function addCreep(chain, creepType, sourceLinkNames, destinationLinkNames) {
    var newLinkName = "Link" + creepType.creepType + memoryUtils.getUid();
    if (!verifyLinkNames(chain, sourceLinkNames) || !verifyLinkNames(chain, destinationLinkNames)) {
        log.error(function () { return "chain/addCreep: Please verify link names!!"; });
        return "";
    }
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
function addNonCreep(chain, target, isSource, isDestination) {
    var newLinkName = "Link" + target.targetType.targetType + memoryUtils.getUid();
    var newLink = {
        linkType: creepTargetTypeToLinkType(target.targetType),
        linkName: newLinkName,
        objectId: fun.Some(target.targetId),
        sources: [],
        destinations: []
    };
    if (isSource)
        chain.sources.push(newLinkName);
    if (isDestination)
        chain.destinations.push(newLinkName);
    chain.links.push(newLink);
    refreshGroup(chain, true);
    return newLinkName;
}
exports.addNonCreep = addNonCreep;
function printChain(chain) {
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        var output = "Link " + link.linkName + " from [";
        output = link.sources.reduce(function (prev, current) { return prev + "  " + current; }, output);
        output = output + " ] to [";
        output = link.destinations.reduce(function (prev, current) { return prev + " " + current; }, output);
        output = output + " ]";
        if (link.linkType.name == eCreep.name) {
            var creepLink = link;
            if (creepLink.status.status == eActive.status && creepLink.creepName.isPresent) {
                output = output + " as creep " + creepLink.creepName.get;
            }
        }
        console.log(output);
    }
}
exports.printChain = printChain;
function editLink(chain, linkName, sources, destinations) {
    if (!verifyLinkNames(chain, sources == null ? [] : sources) || !verifyLinkNames(chain, destinations == null ? [] : destinations)) {
        return log.error(function () { return "chain/editLink: Cannot find some linkName, please verify."; });
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkName == linkName) {
            if (sources != null)
                link.sources = sources;
            if (destinations != null)
                link.destinations = destinations;
            refreshGroup(chain, true);
        }
    }
}
exports.editLink = editLink;
function connectLinks(chain, sourceLinkName, destinationLinkName) {
    if (!verifyLinkNames(chain, [sourceLinkName, destinationLinkName]))
        return log.error(function () { return "chain/connectLink: cannot find link, please verify."; });
    var addAndUniqify = function (elem, arr) {
        arr.push(elem);
        return fun.uniqify(arr);
    };
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkName == sourceLinkName) {
            link.destinations = addAndUniqify(destinationLinkName, link.destinations);
        }
        else if (link.linkName == destinationLinkName) {
            link.sources = addAndUniqify(sourceLinkName, link.sources);
        }
    }
    refreshGroup(chain, true);
}
exports.connectLinks = connectLinks;
function disconnectLinks(chain, sourceLinkName, destinationLinkName) {
    if (!verifyLinkNames(chain, [sourceLinkName, destinationLinkName]))
        return log.error(function () { return "chain/disconnectLink: cannot find link, please verify."; });
    chain.links.forEach(function (link) {
        if (link.linkName == sourceLinkName)
            link.destinations = link.destinations.filter(function (destName) { return destName != destinationLinkName; });
        else if (link.linkName == destinationLinkName)
            link.sources = link.sources.filter(function (srcName) { return srcName != sourceLinkName; });
    });
    refreshGroup(chain, true);
}
exports.disconnectLinks = disconnectLinks;
function deleteLink(chain, linkName) {
    if (!verifyLinkNames(chain, [linkName]))
        return log.error(function () { return "chain/deleteLink: cannot find linkName " + linkName; });
    chain.links.forEach(function (link) {
        link.sources = link.sources.filter(function (src) { return src != linkName; });
        link.destinations = link.destinations.filter(function (dest) { return dest != linkName; });
    });
    chain.links = chain.links.filter(function (link) { return link.linkName != linkName; });
    refreshGroup(chain, true);
}
exports.deleteLink = deleteLink;
