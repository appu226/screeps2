import o = require('./option');
import paraverse = require('./paraverse');

export function loop(): void {
    let pv = paraverse.makeParaverse(Game, Game.map, Memory);
    pv.log(["version"], () => "v 17.10.3");
    pv.endTimer("startup");
    pv.startTimer("main");

    let rooms = pv.getMyRooms();
    rooms.forEach((r) => o.tryCatch(() => r.process(pv), `processing room ${r.room.name}`));

    let sources = pv.getMySources();
    sources.forEach((s) => o.tryCatch(() => s.process(pv), `processing source ${s.source.id}`));

    let structures = pv.getMyStructures();
    structures.forEach((s) => o.tryCatch(() => s.process(pv), `processing structure ${s.element.id}`));

    let creeps = pv.getMyCreeps();
    creeps.forEach((c) => o.tryCatch(() => c.process(pv), `processing structure ${c.element.name}`));

    pv.log(["main"], () => "Completed main loop.");
    pv.log(["timings"], () => {
        pv.printTimings();
        return "=========";
    })
    pv.endTimer("main");
}