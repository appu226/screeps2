import mdict = require('./dictionary');
import mopt = require('./option');

class RoomWrapperImpl implements RoomWrapper {
    room: Room;

    constructor(room: Room) {
        this.room = room;
    }

    process(pv: Paraverse): void {
        let me = this.room;
        if (me.controller.my) {
            //remove stale creep orders.
            let pq = pv.getCreepOrders(me.name);
            while (!pq.isEmpty && pv.game.creeps[pq.peek().get.name] !== undefined) {
                pq.pop();
            }

            let optSource = mopt.None<Source>();

            // check if construction sites already exist
            if (pv.getConstructionSitesFromRoom(me).length > 0) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            } else if (me.controller.level >= 2 && canBuild(me, STRUCTURE_CONTAINER, pv) && (optSource = findSourceWithoutContainer(me, pv)).isPresent) {
                pv.constructNextContainer(optSource.get);
            } else if (canBuild(me, STRUCTURE_EXTENSION, pv)) {
                pv.constructNextSite(me, STRUCTURE_EXTENSION);
            } else if (canBuild(me, STRUCTURE_TOWER, pv)) {
                pv.constructNextSite(me, STRUCTURE_TOWER);
            } else if (canBuild(me, STRUCTURE_ROAD, pv) && pv.mustBuildRoad(me)) {
                let roadPos = pv.getRoadToBeBuilt(me);
                me.createConstructionSite(roadPos.x, roadPos.y, STRUCTURE_ROAD);
            }

            let hostileCreeps = pv.getHostileCreepsInRoom(me);
            for (let hci = 0; hci < hostileCreeps.length; ++hci) {
                let hc = hostileCreeps[hci];
                if (hc.owner.username == "Source Keeper") continue;
                if (pv.getTotalCollectedDefense(hc.id) < pv.getSoldierCapability(hc)) {
                    pv.scheduleCreep(
                        me,
                        pv.makeDefenderOrder(`defender_${me.name}_${hc.id}`, hc.id),
                        2
                    );
                }
            }
            pv.manageResources(me);
        }
    }

}

function canBuild(me: Room, structureType: string, pv: Paraverse): boolean {
    let numExisting = pv.getMyStructuresByRoomAndType(me, structureType).length;
    return (
        CONTROLLER_STRUCTURES[structureType][me.controller.level] !== undefined
        &&
        CONTROLLER_STRUCTURES[structureType][me.controller.level] > numExisting
    );
}

function scheduleBuilderIfRequired(me: Room, pv: Paraverse): void {
    let builders =
        pv.getMyCreepsByRoomAndType(me, pv.CREEP_TYPE_BUILDER);
    if (builders.length == 0) {
        pv.scheduleCreep(me, pv.makeBuilderOrder(`${me.name}_${pv.CREEP_TYPE_BUILDER}`), 2);
    }
}

function isSourceWithoutContainer(sw: SourceWrapper, room: Room, pv: Paraverse): boolean {
    if (sw.source.room.name != room.name)
        return false;

    //skip sources close to lair before until you reach level 4
    let sourceMemory = pv.getSourceMemory(sw.source);
    if (sw.source.room.controller.level < 4 && pv.isCloseToLair(sw.source, sourceMemory))
        return false;

    //check memory
    let cid = sourceMemory.containerId;
    let inMemory = cid != "" && pv.getStructureById(cid).isPresent;

    //if not in memory, check map
    let isClose = inMemory;
    if (!isClose) {
        let containers = pv.getMyStructuresByRoomAndType(
            room,
            STRUCTURE_CONTAINER
        );
        let containersInRange = containers.filter((cw: StructureWrapper) =>
            pv.manhattan(sw.source.pos, cw.element.pos) < 3
        );
        isClose = containersInRange.length > 0;
    }

    return !inMemory && !isClose;
}

function findSourceWithoutContainer(room: Room, pv: Paraverse): Option<Source> {
    let sourcesWithoutContainers = pv.getMySources().filter((sw: SourceWrapper) => isSourceWithoutContainer(sw, room, pv));
    if (sourcesWithoutContainers.length == 0) {
        pv.log.debug(`All sources have containers in room ${room.name}.`);
        return mopt.None<Source>();
    } else {
        pv.log.debug(`Source ${sourcesWithoutContainers[0].source.id} is without container in room ${room.name}`);
        return mopt.Some<Source>(sourcesWithoutContainers[0].source);
    }
}

export function makeRoomWrapper(room: Room): RoomWrapper {
    return new RoomWrapperImpl(room);
}