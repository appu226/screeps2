import memoryUtils = require('./memory');
import log = require('./log')
import fun = require('./functional');
import cu = require('./creep');
import enums = require('./enums');

interface Link {
    linkType: ELinkType;
    linkName: string;
    objectId: fun.Option<string>;
    sources: string[];
    destinations: string[]
}
interface ELinkType { name: string }
const eSpawn: ELinkType = { name: "Spawn" };
const eSource: ELinkType = { name: "Source" };
const eCreep: ELinkType = { name: "Creep" };

interface CreepLink extends Link {
    creepType: cu.ECreepType;
    status: ELinkStatus;
    creepName: fun.Option<string>;
}
interface ELinkStatus { status: string }
const eDead: ELinkStatus = { status: "Dead" };
const eSpawning: ELinkStatus = { status: "Spawning" };
const eActive: ELinkStatus = { status: "Active" };


export interface Chain extends CreepGroup {
    sources: string[];
    destinations: string[];
    links: Link[];
    spawnId: string;
}

export function createSourceToSpawnChain(sourceId: string, spawnId: string): Chain {
    var source = Game.getObjectById<Source>(sourceId);
    if (source == null || source === undefined) {
        log.error(() => `chain/createSourceToSpawnChain: Could not find source with id ${sourceId}`);
        return null;
    }
    var spawn = Game.getObjectById<Spawn>(spawnId);
    if (spawn == null || spawn === undefined) {
        log.error(() => `chain/createSourceToSpawnChain: Could not find spawn with id ${spawnId}`);
        return null;
    }
    var sourceLinkName = "SourceLink" + memoryUtils.getUid().toString();
    var harvestorLinkName = "HarvestorLink"
    var spawnLinkName = "SpawnLink" + memoryUtils.getUid().toString();
    var harvestorLinkName = "HarvestorLink" + memoryUtils.getUid().toString();
    var sourceLink: Link = {
        linkType: eSource,
        linkName: sourceLinkName,
        objectId: fun.Some<string>(sourceId),
        sources: [],
        destinations: [harvestorLinkName]
    };
    var harvestorLink: CreepLink = {
        linkType: eCreep,
        linkName: harvestorLinkName,
        objectId: fun.None<string>(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        creepType: cu.eHarvester,
        status: eDead,
        creepName: fun.None<string>()
    };
    var spawnLink: Link = {
        linkType: eSpawn,
        linkName: spawnLinkName,
        objectId: fun.Some<string>(spawnId),
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

function mustRefreshChain(chain: Chain): boolean {
    var mustRefresh = false;
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkType.name != eCreep.name) {
            continue;
        }
        var creepLink = <CreepLink>link;
        switch (creepLink.status.status) {
            case eSpawning.status: {
                if (creepLink.creepName.isPresent == false) {
                    log.error(() => `chain/mustRefreshChain: spawning link ${creepLink.linkName} does not have a creep name!`);
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] !== undefined) {
                    creepLink.status = eActive;
                    creepLink.objectId = fun.Some<string>(Game.creeps[creepName].id);
                    mustRefresh = true;
                }
                continue;
            }
            case "ACTIVE": {
                if (creepLink.creepName.isPresent == false) {
                    log.error(() => `chain/mustRefreshChain: active link ${creepLink.linkName} does not have a creep name!`);
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

function bfs(
    current: string[],
    linkMap: { [linkName: string]: Link },
    expand: ((string) => string[])
): string[] {
    return fun.flatten<string>(current.map(
        (linkName: string) => {
            var link = linkMap[linkName];
            if (link.linkType.name != eCreep.name)
                return [linkName];
            var creepLink = <CreepLink>link;
            if (creepLink.status.status == eActive.status)
                return [linkName];
            return bfs(expand(linkName), linkMap, expand);
        }
    ));
}

function linkTypeToCreepTargetType(
    linkType: ELinkType
): cu.ETargetType {
    switch (linkType.name) {
        case eSpawn.name: return cu.eSpawn;
        case eSource.name: return cu.eSource;
        case eCreep.name: return cu.eCreep;
        default: {
            log.error(() => `chain/linkTypeToCreepTargetType: unexpected link type ${linkType.name}`)
            return { targetType: "NA" };
        }
    }
}

function updateCreepMemory(
    creep: Creep,
    link: CreepLink,
    linkMap: { [linkName: string]: Link }) {
    var sources = bfs(
        link.sources,
        linkMap,
        (linkName: string) => { return linkMap[linkName].sources; }
    ).map<cu.Target>(
        sourceLinkName => {
            return {
                targetType: linkTypeToCreepTargetType(linkMap[sourceLinkName].linkType),
                targetId: linkMap[sourceLinkName].objectId.get
            }
        });
    var destinations = bfs(
        link.destinations,
        linkMap,
        (linkName: string) => linkMap[linkName].destinations
    ).map<cu.Target>(
        destLinkName => {
            return {
                targetType: linkTypeToCreepTargetType(linkMap[destLinkName].linkType),
                targetId: linkMap[destLinkName].objectId.get
            };
        });
    creep.memory = cu.makeCreepMemory(link.creepType, sources, destinations);
}

export function refreshGroup(group: CreepGroup, forceRefresh: boolean = false) {
    if (group.creepGroupType.name != enums.eChain.name)
        return;
    var chain = <Chain>group;
    if (!mustRefreshChain(chain) && !forceRefresh) return;
    var linkMap: { [linkName: string]: Link } = {};
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        linkMap[chain.links[linkIdx].linkName] = chain.links[linkIdx];
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkType.name != eCreep.name) {
            continue;
        }
        var creepLink = <CreepLink>link;
        if (creepLink.status.status != eActive.status) {
            continue;
        }
        if (!creepLink.creepName.isPresent) {
            log.error(() => `chain/refreshChain: link ${creepLink.linkName} is ACTIVE but has empty creepName`);
            continue;
        }
        var creep = Game.creeps[creepLink.creepName.get];
        creepLink.objectId = fun.Some<string>(creep.id);
        updateCreepMemory(creep, creepLink, linkMap);
    }
}

export function creepToBeSpawned(chain: Chain, energy: number): fun.Option<cu.CreepToBeSpawned> {
    var deadLink: CreepLink = null;
    for (var linkNum = 0; linkNum < chain.links.length && deadLink == null; ++linkNum) {
        var link = chain.links[linkNum];
        if (link.linkType.name == eCreep.name && (<CreepLink>link).status.status == eDead.status)
            deadLink = <CreepLink>link;
    }
    if (deadLink == null)
        return fun.None<cu.CreepToBeSpawned>();
    else {
        var bodyParts = cu.createBodyParts(deadLink.creepType, energy);
        deadLink.creepName = fun.Some<string>(deadLink.creepType.creepType + memoryUtils.getUid());
        deadLink.status = eSpawning;
        var memory = cu.makeCreepMemory(deadLink.creepType, [], []);
        return fun.Some<cu.CreepToBeSpawned>(
            {
                creepName: deadLink.creepName.get,
                bodyParts: bodyParts,
                creepMemory: memory
            }
        )
    }
}

export function addCreep(chain: Chain, creepType: cu.ECreepType, sourceLinkNames: string[], destinationLinkNames: string[]) {
    var newLinkName = `Link${creepType.creepType}${memoryUtils.getUid()}`;
    chain.links.forEach(
        (chainLink: Link) => {
            //if it is in sourceLinkNames
            if (fun.contains(sourceLinkNames, chainLink.linkName)) {
                //remove all it's destinations that are in destinationLinkNames
                chainLink.destinations = chainLink.destinations.filter(
                    (chainLinkDestination: string) => fun.contains(destinationLinkNames, chainLinkDestination)
                );

                //add newLinkName as a destinations
                chainLink.destinations.push(newLinkName);
            }

            //if it is in destinationLinkNames
            if (fun.contains(destinationLinkNames, chainLink.linkName)) {
                //remove all it's sources that are in sourceLinkNames
                chainLink.sources = chainLink.sources.filter(
                    (chainLinkSource: string) => fun.contains(sourceLinkNames, chainLinkSource)
                );

                //add newLinkName as a source
                chainLink.sources.push(newLinkName);
            }
        }
    );
    var newLink: CreepLink = {
        creepType: creepType,
        status: eDead,
        creepName: fun.None<string>(),
        linkType: eCreep,
        linkName: newLinkName,
        objectId: fun.None<string>(),
        sources: sourceLinkNames,
        destinations: destinationLinkNames
    };
    chain.links.push(newLink);
    refreshGroup(chain, true);
}

function createLink(
    objId: string,
    objType: cu.ETargetType,
    creepType: fun.Option<cu.ECreepType>): Link {
    switch (objType.targetType) {
        case cu.eCreep.targetType: {
            if (!creepType.isPresent) {
                log.error(() => `chain/createLink: creepType empty while creating link for ${objId}`)
                return null;
            }
            var creep = Game.getObjectById<Creep>(objId);
            if (creep == null || creep === undefined) {
                log.error(() => `chain/createLink: could not find creep with id ${objId}`);
                return null;
            }
            var creepLink: CreepLink = {
                linkType: eCreep,
                linkName: `CreepLink${memoryUtils.getUid()}`,
                objectId: fun.Some<string>(objId),
                creepType: creepType.get,
                status: eActive,
                creepName: fun.Some<string>(creep.name),
                sources: [],
                destinations: []
            }
            return creepLink;
        }
        case cu.eSource.targetType: {
            var sourceLink: Link = {
                linkType: eSource,
                linkName: `LinkSource${memoryUtils.getUid()}`,
                objectId: fun.Some<string>(objId),
                sources: [],
                destinations: []
            };
            return sourceLink;
        }
        case cu.eSpawn.targetType: {
            var spawnLink: Link = {
                linkType: eSpawn,
                linkName: `LinkSpawn${memoryUtils.getUid()}`,
                objectId: fun.Some<string>(objId),
                sources: [],
                destinations: []
            }
            return spawnLink;
        }
        default: {
            log.error(() => `chain/createLink: objType ${objType.targetType} not supported.`)
        }
    }
}

export function createChain(
    sourceId: string, sourceType: cu.ETargetType,
    targetId: string, targetType: cu.ETargetType,
    spawnId: string,
    sourceCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>(),
    targetCreepType: fun.Option<cu.ECreepType> = fun.None<cu.ECreepType>()): CreepGroup {
    var source: Link = createLink(sourceId, sourceType, sourceCreepType);
    if (source == null) return null;
    var destination: Link = createLink(targetId, targetType, targetCreepType);
    if (destination == null) return null;
    source.destinations = [destination.linkName];
    destination.sources = [source.linkName];
    var chain: Chain = {
        creepGroupType: enums.eChain,
        creepGroupName: `Chain${memoryUtils.getUid()}`,
        sources: [source.linkName],
        destinations: [destination.linkName],
        links: [source, destination],
        spawnId: spawnId
    };
    return chain;
}