var creepUtils = require('../javaScript/creep');
var assert = require('assert');

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

var allTests = {
    testBuilderBodyCreation: testBuilderBodyCreation
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