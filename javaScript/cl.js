"use strict";
var memoryUtils = require("./memory");
var log = require("./log");
var fun = require("./functional");
var chain = require("./chain");
var enums = require("./enums");
function createChain(sourceId, sourceType, targetId, targetType, spawnId, sourceCreepType, targetCreepType) {
    if (sourceCreepType === void 0) { sourceCreepType = fun.None(); }
    if (targetCreepType === void 0) { targetCreepType = fun.None(); }
    var chn = chain.createChain(sourceId, sourceType, targetId, targetType, spawnId, sourceCreepType, targetCreepType);
    if (chn != null)
        memoryUtils.enrichedMemory().creepGroups.push(chn);
}
exports.createChain = createChain;
function addNonCreepLink(chainName, target, isSource, isDestination) {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addNonCreep(creepGroup, target, isSource, isDestination);
        }
    }
}
exports.addNonCreepLink = addNonCreepLink;
function addCreep(chainName, creepType, sourceLinkNames, destinationLinkNames) {
    var creepGroups = memoryUtils.enrichedMemory().creepGroups;
    for (var ci = 0; ci < creepGroups.length; ++ci) {
        var creepGroup = creepGroups[ci];
        if (creepGroup.creepGroupName == chainName &&
            creepGroup.creepGroupType.name == enums.eChain.name) {
            return chain.addCreep(creepGroup, creepType, sourceLinkNames, destinationLinkNames);
        }
    }
}
exports.addCreep = addCreep;
function executeCustomCommand() {
    var nextCommandNumber = 5;
    if (memoryUtils.enrichedMemory().lastCommandNumber < nextCommandNumber) {
        // delete (memoryUtils.enrichedMemory()).isInitialized;
        memoryUtils.enrichedMemory().lastCommandNumber = nextCommandNumber;
        memoryUtils.enrichedMemory().logLevel = memoryUtils.LogLevel.INFO;
        log.info(function () { return "Executing command " + nextCommandNumber; });
        (memoryUtils.enrichedMemory().creepGroups[0]).links[19].sources[0] = "LinkTransporter45";
        chain.refreshGroup((memoryUtils.enrichedMemory().creepGroups[0]), true);
        /*
[11:08:23]Link SourceLink0 from [ ] to [ HarvestorLink2 LinkHarvester5 LinkHarvester7 ]
[11:08:23]Link SpawnLink1 from [  LinkTransporter8 ] to [ ]
[11:08:23]Link HarvestorLink2 from [  SourceLink0 ] to [ LinkTransporter8 ] as creep Harvester2705
[11:08:23]Link LinkHarvester5 from [  SourceLink0 ] to [ LinkTransporter8 ] as creep Harvester2706
[11:08:23]Link LinkHarvester7 from [  SourceLink0 ] to [ LinkTransporter8 ] as creep Harvester2707
[11:08:23]Link LinkTransporter8 from [  HarvestorLink2  LinkHarvester5  LinkHarvester7 ] to [ SpawnLink1 LinkExtension298 LinkExtension299 LinkExtension300 LinkExtension301 LinkExtension302 LinkContainer436 ] as creep Transporter2709
[11:08:23]Link LinkSource11 from [ ] to [ LinkHarvester13 LinkHarvester15 LinkHarvester17 ]
[11:08:23]Link LinkController12 from [  LinkUpdater19  LinkUpdater23  LinkUpdater25 ] to [ ]
[11:08:23]Link LinkHarvester13 from [  LinkSource11 ] to [ LinkTransporter20 ] as creep Harvester2710
[11:08:23]Link LinkHarvester15 from [  LinkSource11 ] to [ LinkTransporter20 ]
[11:08:23]Link LinkHarvester17 from [  LinkSource11 ] to [ LinkTransporter20 ] as creep Harvester2708
[11:08:23]Link LinkUpdater19 from [  LinkTransporter34 ] to [ LinkController12 ] as creep Updater2711
[11:08:23]Link LinkTransporter20 from [  LinkHarvester13  LinkHarvester15  LinkHarvester17 ] to [ LinkTransporter34 ] as creep Transporter2704
[11:08:23]Link LinkUpdater23 from [  LinkTransporter34 ] to [ LinkController12 ] as creep Updater2712
[11:08:23]Link LinkUpdater25 from [  LinkTransporter34 ] to [ LinkController12 ] as creep Updater2713
[11:08:23]Link LinkBuilder27 from [  LinkTransporter45 ] to [ SpawnLink1 ] as creep Builder2714
[11:08:23]Link LinkTransporter34 from [  LinkTransporter20 ] to [ LinkUpdater19 LinkUpdater23 LinkUpdater25 ] as creep Transporter2715
[11:08:23]Link LinkTransporter45 from [  LinkContainer436 ] to [ LinkBuilder27 ] as creep Transporter2716
[11:08:23]Link LinkTransporter49 from [  LinkContainer436 ] to [ LinkTower559 ] as creep Transporter2717
[11:08:23]Link LinkExtension298 from [ ] to [ ]
[11:08:23]Link LinkExtension299 from [ ] to [ ]
[11:08:23]Link LinkExtension300 from [ ] to [ ]
[11:08:23]Link LinkExtension301 from [ ] to [ ]
[11:08:23]Link LinkExtension302 from [ ] to [ ]
[11:08:23]Link LinkContainer436 from [  LinkTransporter8 ] to [ LinkTransporter45 LinkTransporter49 ]
[11:08:23]Link LinkTower559 from [  LinkTransporter49 ] to [ ]

*/
        //  LinkTransporter45 -> LinkTransporter49 -> LinkTransporter55 -> LinkTransporter57 -> LinkTransporter95 -> LinkTransporter61 -> LinkBuilder93
        //                               |                                                                                      |
        //                               V                                                                                      V
        //                         LinkTower559                                                                          LinkBuilder27
        //  
        //
        //  LinkTransporter45 -> LinkBuilder27
        //  LinkTransporter49 ->  LinkTower559
        var chn = memoryUtils.enrichedMemory().creepGroups[0];
        chain.connectLinks(chn, "LinkTransporter45", "LinkBuilder27");
        chain.connectLinks(chn, "LinkTransporter49", "LinkTower559");
        chain.connectLinks(chn, "LinkContainer436", "LinkTransporter49");
        chain.disconnectLinks(chn, "LinkTransporter45", "LinkTransporter49");
        chain.deleteLink(chn, "LinkTransporter55");
        chain.deleteLink(chn, "LinkTransporter57");
        chain.deleteLink(chn, "LinkTransporter95");
        chain.deleteLink(chn, "LinkTransporter61");
        chain.deleteLink(chn, "LinkBuilder93");
        log.info(function () { return "Successfully executed command " + nextCommandNumber; });
    }
}
exports.executeCustomCommand = executeCustomCommand;
