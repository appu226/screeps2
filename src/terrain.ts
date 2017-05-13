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