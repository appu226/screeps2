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
const eController: ELinkType = { name: "Controller" };
const eTower: ELinkType = { name: "Tower" };
const eExtension: ELinkType = { name: "Extension" };
const eContainer: ELinkType = { name: "Container" };

interface CreepLink extends Link {
    creepType: cu.ECreepType;
    status: ELinkStatus;
    creepName: fun.Option<string>;
}
interface ELinkStatus { status: string }
const eDead: ELinkStatus = { status: "Dead" };
const eSpawning: ELinkStatus = { status: "Spawning" };
const eActive: ELinkStatus = { status: "Active" };


interface StructLink extends Link {
    roomName: string;
    x: number;
    y: number;
}

export interface Chain extends CreepGroup {
    sources: string[];
    destinations: string[];
    links: Link[];
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
        if (link.linkType.name == eCreep.name) {
            var creepLink = <CreepLink>link;
            switch (creepLink.status.status) {
                case eSpawning.status: {
                    if (creepLink.creepName.isPresent == false) {
                        log.error(() => `chain/mustRefreshChain: spawning link ${creepLink.linkName} does not have a creep name!`);
                        continue;
                    }
                    var creepName = creepLink.creepName.get;
                    if (Game.creeps[creepName] !== undefined && Game.creeps[creepName].id !== undefined) {
                        creepLink.status = eActive;
                        creepLink.objectId = fun.Some<string>(Game.creeps[creepName].id);
                        mustRefresh = true;
                    }
                    continue;
                }
                case eActive.status: {
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
        } else if (link.linkType.name != eController.name
            && link.linkType.name != eSource.name) {
            mustRefresh = mustRefreshStructLink(<StructLink>link) || mustRefresh;
        }
    }
    return mustRefresh;
}

function linkTypeToStructureType(linkType: ELinkType): string {
    switch (linkType.name) {
        case eTower.name:
            return STRUCTURE_TOWER;
        case eSpawn.name:
            return STRUCTURE_SPAWN;
        case eExtension.name:
            return STRUCTURE_EXTENSION;
        case eContainer.name:
            return STRUCTURE_CONTAINER;
        default: {
            var err = `chain/linkTypeToStructureType: Cannot convert linkType ${linkType.name} to structureType`;
            log.error(() => err);
            return err;
        }
    }
}

function mustRefreshStructLink(slink: StructLink): boolean {
    if (slink.objectId.isPresent && Game.getObjectById(slink.objectId.get) != null)
        return false; // structure known to be built, and is still standing

    var result = slink.objectId.isPresent; // if structure has been destroyed, then return true
    slink.objectId = fun.None<string>();
    var isScheduled = false;
    var structureType: string = linkTypeToStructureType(slink.linkType);
    var pos = (new RoomPosition(slink.x, slink.y, slink.roomName));

    pos.look().forEach(
        (value: LookAtResult) => {
            if ( // if already scheduled for construction
                value.constructionSite !== undefined
                && value.constructionSite != null
                && value.constructionSite.structureType == structureType) {
                isScheduled = true;
            } else if ( // if structure was newly built, return true
                value.structure !== undefined
                && value.structure != null
                && value.structure.structureType == structureType
                && (<OwnedStructure>value.structure).my) {
                slink.objectId = fun.Some<string>(value.structure.id);
                result = true;
            }
        }
    );

    if (!isScheduled) pos.createConstructionSite(structureType);

    return result;
}

function bfs(
    current: string[],
    linkMap: { [linkName: string]: Link },
    expand: ((string) => string[])
): string[] {
    return fun.flatten<string>(current.map(
        (linkName: string) => {
            var link = linkMap[linkName];
            if (link.linkType.name != eCreep.name) {
                if (link.objectId.isPresent)
                    return [linkName];
                else
                    return bfs(expand(linkName), linkMap, expand);
            }
            var creepLink = <CreepLink>link;
            if (creepLink.status.status == eActive.status && link.objectId.isPresent)
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
        case eController.name: return cu.eController;
        case eTower.name: return cu.eTower;
        case eExtension.name: return cu.eExtension;
        case eContainer.name: return cu.eContainer;
        default: {
            log.error(() => `chain/linkTypeToCreepTargetType: unexpected link type ${linkType.name}`)
            return { targetType: "NA" };
        }
    }
}

function creepTargetTypeToLinkType(
    targetType: cu.ETargetType
): ELinkType {
    switch (targetType.targetType) {
        case cu.eSpawn.targetType: return eSpawn;
        case cu.eSource.targetType: return eSource;
        case cu.eCreep.targetType: return eCreep;
        case cu.eController.targetType: return eController;
        case cu.eTower.targetType: return eTower;
        case cu.eExtension.targetType: return eExtension;
        case cu.eContainer.targetType: return eContainer;
        default: {
            log.error(() => `chain/creepTargetTypeToLinkType: unexpected creep target type ${targetType.targetType}`)
            return { name: "NA" };
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
        return fun.Some<cu.CreepToBeSpawned>({
            creepName: deadLink.creepName.get,
            bodyParts: bodyParts
        });
    }
}

function verifyLinkNames(chain: Chain, linkNames: string[]): boolean {
    var validNames = chain.links.map((link: Link) => { return link.linkName; });
    return linkNames.reduce<boolean>(
        (previousValue: boolean, currentValue: string) => {
            return previousValue && fun.contains<string>(validNames, currentValue);
        },
        true
    );
}

export function addCreep(chain: Chain, creepType: cu.ECreepType, sourceLinkNames: string[], destinationLinkNames: string[]): string {
    var newLinkName = `Link${creepType.creepType}${memoryUtils.getUid()}`;
    if (!verifyLinkNames(chain, sourceLinkNames) || !verifyLinkNames(chain, destinationLinkNames)) {
        log.error(() => `chain/addCreep: Please verify link names!!`);
        return "";
    }
    chain.links.forEach(
        (chainLink: Link) => {
            //if it is in sourceLinkNames
            if (fun.contains(sourceLinkNames, chainLink.linkName)) {
                //remove all it's destinations that are in destinationLinkNames
                chainLink.destinations = chainLink.destinations.filter(
                    (chainLinkDestination: string) => !fun.contains(destinationLinkNames, chainLinkDestination)
                );

                //add newLinkName as a destinations
                chainLink.destinations.push(newLinkName);
            }

            //if it is in destinationLinkNames
            if (fun.contains(destinationLinkNames, chainLink.linkName)) {
                //remove all it's sources that are in sourceLinkNames
                chainLink.sources = chainLink.sources.filter(
                    (chainLinkSource: string) => !fun.contains(sourceLinkNames, chainLinkSource)
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
    return newLinkName;
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
        case cu.eController.targetType: {
            var controllerLink: Link = {
                linkType: eController,
                linkName: `LinkController${memoryUtils.getUid()}`,
                objectId: fun.Some<string>(objId),
                sources: [],
                destinations: []
            }
            return controllerLink;
        }
        default: {
            log.error(() => `chain/createLink: objType ${objType.targetType} not supported.`)
        }
    }
}

export function createChain(
    spawnId: string): CreepGroup {
    var chain: Chain = {
        creepGroupType: enums.eChain,
        creepGroupName: `Chain${memoryUtils.getUid()}`,
        sources: [],
        destinations: [],
        links: [],
        spawnId: spawnId
    };
    return chain;
}

function structureTypeToLinkType(structureType: string): ELinkType {
    switch (structureType) {
        case STRUCTURE_EXTENSION: return eExtension;
        case STRUCTURE_SPAWN: return eSpawn;
        case STRUCTURE_TOWER: return eTower;
        case STRUCTURE_CONTAINER: return eContainer;
        case STRUCTURE_CONTROLLER: return eController;
        default:
            log.error(() => `chain/structureTypeToLinkType: structure type ${structureType} not implemented.`);
            return eExtension;
    }
}


export function scheduleStructure(chain: Chain, structureType: string, pos: RoomPosition, sources: string[], destinations: string[]): string {
    if (!verifyLinkNames(chain, sources))
        throw "Invalid source link name, please verify.";
    if (!verifyLinkNames(chain, destinations))
        throw "Invalid destination link name, please verify.";

    var targetType = structureTypeToLinkType(structureType);
    var newLinkName = `Link${targetType.name}${memoryUtils.getUid()}`;
    var newLink: StructLink = {
        linkType: targetType,
        linkName: newLinkName,
        objectId: fun.None<string>(),
        sources: [],
        destinations: [],
        x: pos.x,
        y: pos.y,
        roomName: pos.roomName
    };
    chain.links.push(newLink);
    sources.forEach(s => connectLinks(chain, s, newLinkName));
    destinations.forEach(d => connectLinks(chain, newLinkName, d));
    refreshGroup(chain, true);
    return newLinkName;
}

export function addStructure(chain: Chain, structure: Structure, sources: string[], destinations: string[]): string {
    var newLinkName = scheduleStructure(chain, structure.structureType, structure.pos, sources, destinations);
    chain.links[chain.links.length - 1].objectId = fun.Some<string>(structure.id);
    return newLinkName;
}

export function addSource(chain: Chain, source: Source): string {
    var newLinkName = `LinkSource${memoryUtils.getUid()}`;
    var newLink: StructLink = {
        linkType: eSource,
        linkName: newLinkName,
        objectId: fun.Some<string>(source.id),
        sources: [],
        destinations: [],
        x: source.pos.x,
        y: source.pos.y,
        roomName: source.pos.roomName
    };
    chain.links.push(newLink);
    refreshGroup(chain, true);
    return newLinkName;
}

export function printChain(chain: Chain) {
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        var output = `Link ${link.linkName} from [`;
        output = link.sources.reduce<string>((prev: string, current: string) => `${prev}  ${current}`, output);
        output = output + " ] to ["
        output = link.destinations.reduce<string>((prev: string, current: string) => `${prev} ${current}`, output);
        output = output + " ]"
        if (link.linkType.name == eCreep.name) {
            var creepLink = <CreepLink>link;
            if (creepLink.status.status == eActive.status && creepLink.creepName.isPresent) {
                output = output + " as creep " + creepLink.creepName.get;
            }
        }
        console.log(output);
    }
}

export function editLink(chain: Chain, linkName: string, sources: string[], destinations: string[]) {
    if (!verifyLinkNames(chain, sources == null ? [] : sources) || !verifyLinkNames(chain, destinations == null ? [] : destinations)) {
        return log.error(() => `chain/editLink: Cannot find some linkName, please verify.`);
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkName == linkName) {
            if (sources != null) link.sources = sources;
            if (destinations != null) link.destinations = destinations;
            refreshGroup(chain, true);
        }
    }
}

export function connectLinks(chain: Chain, sourceLinkName: string, destinationLinkName: string) {
    if (!verifyLinkNames(chain, [sourceLinkName, destinationLinkName]))
        return log.error(() => `chain/connectLink: cannot find link, please verify.`);
    var addAndUniqify = function (elem: string, arr: string[]): string[] {
        arr.push(elem);
        return fun.uniqify<string>(arr);
    }
    for (var linkIdx = 0; linkIdx < chain.links.length; ++linkIdx) {
        var link = chain.links[linkIdx];
        if (link.linkName == sourceLinkName) {
            link.destinations = addAndUniqify(destinationLinkName, link.destinations);
        } else if (link.linkName == destinationLinkName) {
            link.sources = addAndUniqify(sourceLinkName, link.sources);
        }
    }
    refreshGroup(chain, true);
}

export function disconnectLinks(chain: Chain, sourceLinkName: string, destinationLinkName: string) {
    if (!verifyLinkNames(chain, [sourceLinkName, destinationLinkName]))
        return log.error(() => `chain/disconnectLink: cannot find link, please verify.`);
    chain.links.forEach((link: Link) => {
        if (link.linkName == sourceLinkName)
            link.destinations = link.destinations.filter((destName: string) => { return destName != destinationLinkName; });
        else if (link.linkName == destinationLinkName)
            link.sources = link.sources.filter((srcName: string) => { return srcName != sourceLinkName; });
    });
    refreshGroup(chain, true);
}

export function deleteLink(chain: Chain, linkName: string) {
    if (!verifyLinkNames(chain, [linkName]))
        return log.error(() => `chain/deleteLink: cannot find linkName ${linkName}`);
    chain.links.forEach((link: Link) => {
        link.sources = link.sources.filter((src: string) => { return src != linkName; });
        link.destinations = link.destinations.filter((dest: string) => { return dest != linkName; });
    });
    chain.links = chain.links.filter((link: Link) => { return link.linkName != linkName; });
    refreshGroup(chain, true);
}
