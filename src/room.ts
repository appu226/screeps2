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
            let doConstructionSitesExist: boolean =
                pv.getConstructionSitesFromRoom(me).filter(
                    (cs: ConstructionSite) => cs.my
                ).length > 0;
            if (doConstructionSitesExist) {
                //if construction sites already exist, schedule a builder unless one alread exists
                scheduleBuilderIfRequired(me, pv);
            } else {
                //if no construction sites, check if we need any
                let scheduled =
                    scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_ROAD)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_WALL)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_TOWER)
                    || scheduleConstructionSitesIfRequired(me, pv, STRUCTURE_EXTENSION);
                if (scheduled) {
                    pv.log.debug(`Scheduled structure in room ${me.name}`);
                }
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

function scheduleBuilderIfRequired(me: Room, pv: Paraverse): void {
    let builders =
        pv.getMyCreepsByRoomAndType(me, pv.CREEP_TYPE_BUILDER);
    if (builders.length == 0) {
        pv.scheduleCreep(me.name, pv.makeBuilderOrder(`${me.name}_${pv.CREEP_TYPE_BUILDER}`), 2);
    }
}

function scheduleConstructionSitesIfRequired(room: Room, pv: Paraverse, structureType: string): boolean {
    let alreadyAvailable =
        pv.getMyStructures().filter(sw => sw.my && sw.structure.room.name == room.name && sw.structure.structureType == structureType);
    let possibleConstructionSites =
        pv.getPossibleConstructionSites(room);
    let plannedConstructionSites =
        pv.getPlannedConstructionSites(room.name).filter(pcs => pcs.structureType == structureType && possibleConstructionSites[pcs.x][pcs.y]);
    if (plannedConstructionSites.length == 0 // nothing planned 
        || alreadyAvailable.length >= plannedConstructionSites.length // more created than planned
        || alreadyAvailable.length >= CONTROLLER_STRUCTURES[structureType][room.controller.level] // cannot create more
    ) {
        return false;
    } else {
        let pcs = plannedConstructionSites[0];
        return room.createConstructionSite(pcs.x, pcs.y, structureType) == OK;
    }
}

export function makeRoomWrapper(room: Room): RoomWrapper {
    return new RoomWrapperImpl(room);
}