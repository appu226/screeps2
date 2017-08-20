"use strict";
var o = require("./option");
var paraverse = require("./paraverse");
function loop() {
    var pv = paraverse.makeParaverse(Game, Game.map, Memory);
    var rooms = pv.getMyRooms();
    rooms.forEach(function (r) { return o.tryCatch(function () { return r.process(pv); }, "processing room " + r.room.name); });
    var sources = pv.getMySources();
    sources.forEach(function (s) { return o.tryCatch(function () { return s.process(pv); }, "processing source " + s.source.id); });
    var structures = pv.getMyStructures();
    structures.forEach(function (s) { return o.tryCatch(function () { return s.process(pv); }, "processing structure " + s.structure.id); });
    var creeps = pv.getMyCreeps();
    creeps.forEach(function (c) { return o.tryCatch(function () { return c.process(pv); }, "processing structure " + c.creep.name); });
    pv.log.debug("Completed main loop.");
}
exports.loop = loop;
