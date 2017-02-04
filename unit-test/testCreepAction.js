var creepUtils = require('../javaScript/creep');
var assert = require('assert');
var mapUtils = require('../javaScript/map');
var fun = require('../javaScript/functional');

global.MOVE = "move";
global.WORK = "work";
global.CARRY = "carry";
global.ATTACK = "attack";
global.RANGED_ATTACK = "ranged_attack";
global.TOUGH = "tough";
global.HEAL = "heal";
global.CLAIM = "claim";

global.BODYPARTS_ALL = [MOVE, WORK, CARRY, ATTACK, RANGED_ATTACK, TOUGH, HEAL, CLAIM];

global.BODYPART_COST = {
    move: 50,
    work: 100,
    attack: 80,
    carry: 50,
    heal: 250,
    ranged_attack: 150,
    tough: 10,
    claim: 600
};


function testBuilderBodyCreation() {
    var builderBody = creepUtils.createBodyParts(creepUtils.eBuilder, 300);
    var expectedBody = [MOVE, CARRY, WORK, WORK];
    assert(builderBody.length == expectedBody.length,
        "Builder body incorrect length. Expected: " +
        expectedBody.length + ". Found: " +
        builderBody.length + ".");
    for (var i = 0; i < builderBody.length; ++i) {
        assert(builderBody[i] == expectedBody[i],
            "builderBody[" + i + "] = " +
            builderBody[i] + " != " +
            expectedBody[i]);
    }
}

function testMakePath() {
    assert(pathEquality(
        mapUtils.findLinearPath(0, 0, 5, 5),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: i, y: i }; })
    ));
    assert(pathEquality(
        mapUtils.findLinearPath(0, 5, 5, 0),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: i, y: 5 - i }; })
    ));
    assert(pathEquality(
        mapUtils.findLinearPath(0, 0, 5, 0),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: i, y: 0 }; })
    ));
    assert(pathEquality(
        mapUtils.findLinearPath(0, 0, 0, -5),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: 0, y: (0 - i) }; })
    ));
    assert(pathEquality(
        mapUtils.findLinearPath(0, 0, 5, 1),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: i, y: Math.floor(i / 3) }; })
    ));

    var ys = [0, 1, 1, 2, 3, 3];
    assert(pathEquality(
        mapUtils.findLinearPath(0, 0, 5, 3),
        fun.aToBStepC(0, 5, 1).map(function (i) { return { x: i, y: ys[i] }; })
    ));

    var xs = [8, 9, 9, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 17, 18, 18];
    assert(pathEquality(
        mapUtils.findLinearPath(8, 20, 18, 38),
        fun.aToBStepC(20, 38, 1).map(function (i) { return { x: xs[i - 20], y: i }; })
    ));
}

function pathEquality(a, b) {
    if (a.length == null || a.length === undefined
        || b.length == null || b.length === undefined
        || a.length != b.length) {
        console.log("Length " + a.length + " != " + b.length);
        return false;
    }
    for (var i = 0; i < a.length; ++i) {
        if (a[i].x == null || a[i].x === undefined
            || b[i].x == null || b[i].x === undefined
            || a[i].x != b[i].x) {
            console.log(i + "th x value " + a[i].x + " != " + b[i].x);
            return false;
        }
        if (a[i].y == null || a[i].y === undefined
            || b[i].y == null || b[i].y === undefined
            || a[i].y != b[i].y) {
            console.log(i + "th y value " + a[i].y + " != " + b[i].y);
            return false;
        }
    }
    return true;

}

var allTests = {
    testBuilderBodyCreation: testBuilderBodyCreation,
    testMakePath: testMakePath
}

var ran = 0;
var failed = 0;
var succeeded = 0;
var errors = [];

for (var testName in allTests) {
    try {
        console.log("[Test]: Running " + testName);
        allTests[testName]();
        console.log("[Test]: " + testName + " succeeded.");
        ++succeeded;
    } catch (err) {
        console.log("[Test]: " + testName + " failed.");
        ++failed;
        console.log(err);
        errors.push(err);
    } finally {
        ++ran;
    }
}

console.log("[Test]: Ran: " + ran + "      succeeded: " + succeeded + "     failed: " + failed);