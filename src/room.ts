import mdict = require('./dictionary');

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

            // check if construction sites already exist
            if (pv.getConstructionSitesFromRoom(me).length > 0) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            } else if (canBuild(me, STRUCTURE_EXTENSION, pv)) {
                pv.constructNextSite(me, STRUCTURE_EXTENSION);
            } else if (canBuild(me, STRUCTURE_ROAD, pv) && pv.mustBuildRoad(me)) {
                let roadPos = pv.getRoadToBeBuilt(me);
                pv.log.debug(`creating construction site at ${me.name}[${roadPos.x}][${roadPos.y}]`);
                me.createConstructionSite(roadPos.x, roadPos.y, STRUCTURE_ROAD);
            } else if (canBuild(me, STRUCTURE_TOWER, pv)) {
                pv.constructNextSite(me, STRUCTURE_TOWER);
            } else if (me.controller.level > 1 && canBuild(me, STRUCTURE_CONTAINER, pv)) {
                pv.constructNextSite(me, STRUCTURE_CONTAINER);
            }

            if (pv.getTransporterEfficiency(me) > .9) {
                pv.scheduleCreep(
                    me.name,
                    pv.makeTransporterOrder(`Transporter_${me.name}`),
                    4
                );
            }

            let hostileCreeps = pv.getHostileCreepsInRoom(me);
            for (let hci = 0; hci < hostileCreeps.length; ++hci) {
                let hc = hostileCreeps[hci];
                if (hc.owner.username == "Source Keeper") continue;
                if (pv.getTotalCollectedDefense(hc.id) < pv.getSoldierCapability(hc)) {
                    pv.scheduleCreep(
                        me.name,
                        pv.makeDefenderOrder(`defender_${me.name}_${hc.id}`, hc.id),
                        2
                    );
                }
            }
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
        pv.scheduleCreep(me.name, pv.makeBuilderOrder(`${me.name}_${pv.CREEP_TYPE_BUILDER}`), 2);
    }
}

export function makeRoomWrapper(room: Room): RoomWrapper {
    return new RoomWrapperImpl(room);
}