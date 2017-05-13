import o = require('./option');
import paraverse = require('./paraverse');

export function loop(): void {
    var pv = paraverse.makeParaverse(Game, Game.map, Memory);

    var rooms = pv.getMyRooms();
    rooms.forEach((r) => o.tryCatch(() => r.process(pv), `processing room ${r.room.name}`));

    var structures = pv.getMyStructures();
    structures.forEach((s) => o.tryCatch(() => s.process(pv), `processing structure ${s.structure.id}`));

    var creeps = pv.getMyCreeps();
    creeps.forEach((c) => o.tryCatch(() => c.process(pv), `processing structure ${c.creep.name}`));

    var sources = pv.getMySources();
    sources.forEach((s) => o.tryCatch(() => s.process(pv), `processing source ${s.source.id}`));
}