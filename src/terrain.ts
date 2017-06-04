export function terrainStringToCode(terrain: string, pv: Paraverse): number {
    switch (terrain) {
        case "plain":
            return pv.TERRAIN_CODE_PLAIN;
        case "swamp":
            return pv.TERRAIN_CODE_SWAMP;
        case "wall":
            return pv.TERRAIN_CODE_WALL;
        case "lava":
            return pv.TERRAIN_CODE_LAVA;
        default:
            throw new Error(`terrainStringToCode: terrain ${terrain} not supported.`);
    }
}

export function euclidean(p1: RoomPosition, p2: RoomPosition, pv: Paraverse): number {
    if (p1.roomName == p2.roomName) {
        let dx = p1.x - p2.x;
        let dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    } else {
        return pv.map.getRoomLinearDistance(p1.roomName, p2.roomName) * 50 * Math.sqrt(2);
    }
}