var option = require('../javaScript/option');
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

function testQueue() {
    //Generate all possible permutations of pushes and pops
    var nElems = 5;
    var elems = [];
    var count = 0;
    for (var ei = 0; ei < nElems; ++ei) {
        elems.push(ei + 1);
    }
    var queue = new option.makeQueue([]);
    for (var inputSeq = (1 << (nElems * 2)) - 1; inputSeq >= 0; --inputSeq) {
        //inputSeq is bitwise representation of pushes and pops.
        //1 is push, 0 is pop.
        //Sequence of operations is from right to left.
        var is = inputSeq; // copy the inputSeq to not disturb it.
        var output = []; //output sequence to collect all pops
        var pushIndex = 0; //index of next element to be pushed
        while (is != 0) { //zero means pop till empty, which is handled in the loop below.
            if (is % 2 == 1 //must push
                && pushIndex < elems.length// can push
            ) {
                queue.push(elems[pushIndex]);
                ++pushIndex;
            } else if (is % 2 == 0 // must pop
                && !queue.isEmpty() // can pop
            ) {
                var pop = queue.pop();
                assert(pop.isPresent, "popped element must be present");
                output.push(pop.get);
            } else if (queue.isEmpty()) {
                assert(queue.pop().isPresent == false, "empty queue should pop None.")
            }
            is = (is >> 1);
            assert(queue.length() + output.length == pushIndex, "each pushed element is either in queue or in output.")
        }
        //now push the remaining
        while (pushIndex < nElems) {
            queue.push(elems[pushIndex]);
            ++pushIndex;
        }
        //now pop the remaining
        while (!queue.isEmpty()) {
            var pop = queue.pop();
            assert(pop.isPresent, "popped element must be present");
            output.push(pop.get);
        }
        assert(
            output.length == elems.length,
            "output.length(" + output.length + ") should be equal to elems.length(" + elems.length + ")"
        );
        assert(
            elems.length == nElems,
            "elems.length(" + elems.length + ") should be equal to nElems(" + nElems + ")"
        );
        for (var ei = 0; ei < nElems; ++ei) {
            assert(
                output[ei] == elems[ei],
                "output[ei(" + ei + ")](" + output[ei] + ") should be equal to elems[ei](" + elems[ei] + ")"
            );
        }
        assert(queue.isEmpty(), "empty queue should have isEmpty() true.");
        assert(queue.pop().isPresent == false, "empty queue should pop a None.")
        ++count;
    }
    var expectedCount = Math.pow(2, nElems * 2);
    assert(count == expectedCount, "Count should be " + expectedCount + " found " + count + ".");
}

function testPriorityQueue() {
    var elems = ["seven", "six", "five", "four", "three", "two", "one"];
    var priorities = elems.map((v, index) => (elems.length - 1 - index));
    var count = 0;

    //reverse map to find index from element name
    var elemMap = {};
    for (var ei = 0; ei < elems.length; ++ei) {
        elemMap[elems[ei]] = priorities[ei];
    }

    var pq = option.makePriorityQueue([], []);

    var isFinalPermutation = (perm) => {
        for (var pi = 0; pi < perm.length - 1; ++pi) {
            if (perm[pi] < perm[pi + 1])
                return false;
        }
        return true;
    }
    var makeNextPermutation = (perm) => {
        // going from right to left,
        // find the first point where you see a decrease.
        var pi = perm.length - 1;
        while (pi > 0 && perm[pi - 1] >= perm[pi]) { --pi; }
        if (pi == 0) return;
        --pi;
        // array is [_, _, _, ... pivot, d, c, b, a]
        // where d >= c >= b > =a (etc)
        // and pivot < d
        // let b be the smallest in abcd such that b > pivot
        // then result should be [_, _, _, ... b, a, pivot, c, d]
        var pivot = perm[pi]

        var npi = perm.length - 1;
        while (perm[npi] <= pivot) { --npi; }
        var newPivot = perm[npi];
        perm[pi] = newPivot;
        perm[npi] = pivot;
        var tempSpace = [];
        for (var ti = pi + 1; ti < perm.length; ++ti)
            tempSpace.push(perm[ti]);
        for (var ti = pi + 1; ti < perm.length; ++ti)
            perm[ti] = tempSpace[tempSpace.length - ti + pi];
        return;
    }

    var testPermutation = (perm) => {
        assert(pq.isEmpty, "pq should be empty at start of test");
        perm.map((v) => pq.push(elems[v], priorities[v]));
        var res = [];
        assert(!pq.isEmpty, "pq with elements should not be empty");
        assert(pq.length == perm.length, "pq must have length " + perm.length + ", found " + pq.length);
        while (!pq.isEmpty) {
            var pop = pq.pop();
            assert(pop.isPresent, "Element popped from non empty pq should be present.");
            res.push(pop.get);
            ++count;
        }
        assert(res.length == elems.length, "number of pops should be equal to the number of pushes.");
        elems.map((v, i) => assert(res[i] == v, "extracted " + i + "th value (" + res[i] + ") should be equal to " + v));
        assert(pq.isEmpty, "pq should be empty after test1.");

        var entries = perm.map((v) => pq.push(elems[v], 0));
        entries.map((v) => pq.prioritize(v.index, elemMap[v.elem]));
        res = [];
        assert(!pq.isEmpty, "pq with elements should not be empty");
        assert(pq.length == perm.length, "pq must have length " + perm.length + ", found " + pq.length);
        while (!pq.isEmpty) {
            var pop = pq.pop();
            assert(pop.isPresent, "Element popped from non empty pq should be present.");
            res.push(pop.get);
            ++count;
        }
        assert(res.length == elems.length, "number of pops should be equal to the number of pushes.");
        elems.map((v, i) => assert(res[i] == v, "extracted " + i + "th value (" + res[i] + ") should be equal to " + v));
        assert(pq.isEmpty, "pq should be empty after test2.");

        entries = perm.map((v) => pq.push(elems[v], 5000));
        entries.map((v) => pq.prioritize(v.index, elemMap[v.elem]));
        res = [];
        assert(!pq.isEmpty, "pq with elements should not be empty");
        assert(pq.length == perm.length, "pq must have length " + perm.length + ", found " + pq.length);
        while (!pq.isEmpty) {
            var pop = pq.pop();
            assert(pop.isPresent, "Element popped from non empty pq should be present.");
            res.push(pop.get);
            ++count;
        }
        assert(res.length == elems.length, "number of pops should be equal to the number of pushes.");
        elems.map((v, i) => assert(res[i] == v, "extracted " + i + "th value (" + res[i] + ") should be equal to " + v));
        assert(pq.isEmpty, "pq should be empty after test3.");

    }

    for (
        var permutation = elems.map((v, index) => index);
        !isFinalPermutation(permutation);
        makeNextPermutation(permutation)
    )
        testPermutation(permutation);
    testPermutation(permutation);

    var factorial = elems.map((v, i) => i + 1).reduce((p, c) => p * c, 1);
    assert(count == 3 * factorial * elems.length, "Count should be factorial(nElems) * 3 * nElems = " + factorial * 3 * elems.length + ", was " + count);

}

var allTests = {
    testQueue: testQueue,
    testPriorityQueue: testPriorityQueue
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