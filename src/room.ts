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
        }
    }

}

function scheduleBuilderIfRequired(me: Room, pv: Paraverse): void {
    let builders =
        pv.getMyCreeps().filter((cw) =>
            cw.creep.my
            && cw.creep.room.name == me.name
            && cw.creepType == pv.CREEP_TYPE_BUILDER
        );
    if (builders.length == 0) {
        pv.scheduleCreep(me.name, `${me.name}_${pv.CREEP_TYPE_BUILDER}`, pv.CREEP_TYPE_BUILDER, 5);
    }
}

function scheduleConstructionSitesIfRequired(room: Room, pv: Paraverse, structureType: string): boolean {
    let terrain: number[][] = pv.getTerrainWithStructures(room);
    let structureCode: number = pv.getStructureCode(structureType);
    let alreadyAvailable =
        terrain.reduce<number>(
            (prev, current) =>
                current.reduce<number>(
                    (prev2, curr2) => curr2 == structureCode ? prev2 + 1 : prev2,
                    prev
                ),
            0
        );
    let plannedConstructionSites =
        pv.getPlannedConstructionSites(room.name).filter((pcs) => {
            let t = terrain[pcs.x][pcs.y];
            return (t == pv.TERRAIN_CODE_SWAMP || t == pv.TERRAIN_CODE_PLAIN)
                && pcs.structureType == structureType
        });
    if (plannedConstructionSites.length == 0 // nothing planned 
        || alreadyAvailable >= plannedConstructionSites.length // more created than planned
        || alreadyAvailable >= CONTROLLER_STRUCTURES[structureType][room.controller.level] // cannot create more
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