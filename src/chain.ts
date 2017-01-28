import memoryUtils = require('./memory');
import log = require('./log')
import functional = require('./functional');
import creepUtils = require('./creep');
import enums = require('./enums');

interface Link {
    linkType: ELinkType;
    linkName: string;
    objectId: functional.Option<string>;
    sources: string[];
    destinations: string[]
}
interface ELinkType{ name: string }
var eSpawn: ELinkType = { name: "Spawn" };
var eSource: ELinkType = { name: "Source" };
var eCreep: ELinkType = { name: "Creep" };

interface CreepLink extends Link {
    creepType: creepUtils.ECreepType;
    status: string; // one of DEAD, SPAWNING, ACTIVE
    creepName: functional.Option<string>;
}

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
        objectId: functional.Some<string>(sourceId),
        sources: [],
        destinations: [harvestorLinkName]
    };
    var harvestorLink: CreepLink = {
        linkType: eCreep,
        linkName: harvestorLinkName,
        objectId: functional.None<string>(),
        sources: [sourceLinkName],
        destinations: [spawnLinkName],
        creepType: creepUtils.eHarvester,
        status: "DEAD",
        creepName: functional.None<string>()
    };
    var spawnLink: Link = {
        linkType: eSpawn,
        linkName: spawnLinkName,
        objectId: functional.Some<string>(spawnId),
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
        switch (creepLink.status) {
            case "SPAWNING": {
                if (creepLink.creepName.isPresent == false) {
                    log.error(() => `chain/mustRefreshChain: spawning link ${creepLink.linkName} does not have a creep name!`);
                    continue;
                }
                var creepName = creepLink.creepName.get;
                if (Game.creeps[creepName] !== undefined) {
                    creepLink.status = "ACTIVE";
                    creepLink.objectId = functional.Some<string>(Game.creeps[creepName].id);
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

function bfs(
    current: string[],
    linkMap: { [linkName: string]: Link },
    expand: ((string) => string[])
): string[] {
    return functional.flatten<string>(current.map(
        (linkName: string) => {
            var link = linkMap[linkName];
            if (link.linkType.name != eCreep.name)
                return [linkName];
            var creepLink = <CreepLink>link;
            if (creepLink.status == "ACTIVE")
                return [linkName];
            return bfs(expand(linkName), linkMap, expand);
        }
    ));
}

function linkTypeToCreepTargetType(
    linkType: ELinkType
): creepUtils.ETargetType {
    switch(linkType.name) {
        case eSpawn.name: return creepUtils.eSpawn;
        case eSource.name: return creepUtils.eSource;
        case eCreep.name: return creepUtils.eCreep;
        default: {
            log.error(() => `chain/linkTypeToCreepTargetType: unexpected link type ${linkType.name}`)
            return {targetType: "NA"};
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
    ).map<creepUtils.Target>(
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
    ).map<creepUtils.Target>(
        destLinkName => {
            return {
                targetType: linkTypeToCreepTargetType(linkMap[destLinkName].linkType),
                targetId: linkMap[destLinkName].objectId.get
            };
        });
    creep.memory = creepUtils.makeCreepMemory(link.creepType, sources, destinations);
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
        if (creepLink.status != "ACTIVE") {
            continue;
        }
        if (!creepLink.creepName.isPresent) {
            log.error(() => `chain/refreshChain: link ${creepLink.linkName} is ACTIVE but has empty creepName`);
            continue;
        }
        var creep = Game.creeps[creepLink.creepName.get];
        creepLink.objectId = functional.Some<string>(creep.id);
        updateCreepMemory(creep, creepLink, linkMap);
    }
}

export function creepToBeSpawned(chain: Chain, energy: number): functional.Option<creepUtils.CreepToBeSpawned> {
    var deadLink: CreepLink = null;
    for (var linkNum = 0; linkNum < chain.links.length && deadLink == null; ++linkNum) {
        var link = chain.links[linkNum];
        if (link.linkType.name == eCreep.name && (<CreepLink>link).status == "DEAD")
            deadLink = <CreepLink>link;
    }
    if (deadLink == null)
        return functional.None<creepUtils.CreepToBeSpawned>();
    else {
        var bodyParts = creepUtils.createBodyParts(deadLink.creepType, energy);
        deadLink.creepName = functional.Some<string>(deadLink.creepType.creepType + memoryUtils.getUid());
        deadLink.status = "SPAWNING";
        var memory = creepUtils.makeCreepMemory(deadLink.creepType, [], []);
        return functional.Some<creepUtils.CreepToBeSpawned>(
            {
                creepName: deadLink.creepName.get,
                bodyParts: bodyParts,
                creepMemory: memory
            }
        )
    }
}

export function addCreep(chain: Chain, creepType: creepUtils.ECreepType, sourceLinkNames: string[], destinationLinkNames: string[]) {
    var newLinkName = `Link${creepType.creepType}${memoryUtils.getUid()}`;
    chain.links.forEach(
        (chainLink: Link) => {
            //if it is in sourceLinkNames
            if (functional.contains(sourceLinkNames, chainLink.linkName)) {
                //remove all it's destinations that are in destinationLinkNames
                chainLink.destinations = chainLink.destinations.filter(
                    (chainLinkDestination: string) => functional.contains(destinationLinkNames, chainLinkDestination)
                );
                
                //add newLinkName as a destinations
                chainLink.destinations.push(newLinkName);
            }

            //if it is in destinationLinkNames
            if(functional.contains(destinationLinkNames, chainLink.linkName)) {
                //remove all it's sources that are in sourceLinkNames
                chainLink.sources = chainLink.sources.filter(
                    (chainLinkSource: string) => functional.contains(sourceLinkNames, chainLinkSource)
                );

                //add newLinkName as a source
                chainLink.sources.push(newLinkName);
            }


        }
    );
    var newLink: CreepLink = {
        creepType: creepType,
        status: "DEAD",
        creepName: functional.None<string>(),
        linkType: eCreep,
        linkName: newLinkName,
        objectId: functional.None<string>(),
        sources: sourceLinkNames,
        destinations: destinationLinkNames
    };
    chain.links.push(newLink);
    refreshGroup(chain, true);
}