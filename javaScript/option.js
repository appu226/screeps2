"use strict";
function None() {
    return {
        get: null,
        isPresent: false
    };
}
exports.None = None;
function Some(elem) {
    return {
        get: elem,
        isPresent: true
    };
}
exports.Some = Some;
var QueueImpl = (function () {
    function QueueImpl(pushStack, popStack) {
        this.pushStack = pushStack;
        this.popStack = popStack;
    }
    QueueImpl.prototype.push = function (elem) {
        this.pushStack.push(elem);
    };
    QueueImpl.prototype.pop = function () {
        if (this.popStack.length == 0) {
            while (this.pushStack.length > 0) {
                this.popStack.push(this.pushStack.pop());
            }
        }
        if (this.popStack.length > 0) {
            return Some(this.popStack.pop());
        }
        else {
            return None();
        }
    };
    QueueImpl.prototype.peek = function () {
        if (this.popStack.length == 0) {
            while (this.pushStack.length > 0) {
                this.popStack.push(this.pushStack.pop());
            }
        }
        if (this.popStack.length > 0) {
            return Some(this.popStack[this.popStack.length - 1]);
        }
        else {
            return None();
        }
    };
    QueueImpl.prototype.length = function () {
        return this.pushStack.length + this.popStack.length;
    };
    QueueImpl.prototype.isEmpty = function () {
        return this.length() == 0;
    };
    return QueueImpl;
}());
function makeQueue(pushStack, popStack) {
    if (popStack === void 0) { popStack = []; }
    return new QueueImpl(pushStack, popStack);
}
exports.makeQueue = makeQueue;
function countElemsInDictionary(dictionary, filter) {
    var result = 0;
    for (var name in dictionary) {
        if (filter(dictionary[name]))
            ++result;
    }
    return result;
}
exports.countElemsInDictionary = countElemsInDictionary;
function maxBy(collection, measure) {
    var results = collection.map(function (elem) { return { elem: elem, measure: measure(elem) }; });
    return results.reduce(function (prevValue, currentValue) {
        if (prevValue.isPresent && prevValue.get.measure > currentValue.measure) {
            return prevValue;
        }
        else {
            return Some(currentValue);
        }
    }, None());
}
exports.maxBy = maxBy;
function sum(arr) {
    return arr.reduce(function (prev, curr) { return prev + curr; }, 0);
}
exports.sum = sum;
var Heap = (function () {
    function Heap(elems) {
        this.data = elems;
        this.refresh();
        this.heapify();
    }
    Heap.prototype.push = function (elem, priority) {
        var entry = {
            index: this.length,
            priority: priority,
            elem: elem
        };
        this.data.push(entry);
        this.refresh();
        this.siftUpRecursively(entry.index);
        return entry;
    };
    Heap.prototype.pop = function () {
        var result = null;
        if (this.isEmpty) {
            return None();
        }
        else if (this.length == 1) {
            result = Some(this.data[0].elem);
            this.data = [];
            this.refresh();
            return result;
        }
        else {
            var result = Some(this.data[0].elem);
            this.data[0] = this.data.pop();
            this.data[0].index = 0;
            this.refresh();
            this.siftDownRecursively(0);
            return result;
        }
    };
    Heap.prototype.peek = function () {
        if (this.isEmpty) {
            return None();
        }
        else {
            return Some(this.data[0].elem);
        }
    };
    Heap.prototype.prioritize = function (index, priority) {
        if (index < 0 || index >= this.length) {
            return None();
        }
        else {
            var entry = this.data[index];
            if (priority > entry.priority) {
                entry.priority = priority;
                this.siftUpRecursively(index);
            }
            else {
                entry.priority = priority;
                this.siftDownRecursively(index);
            }
            return Some(entry);
        }
    };
    Heap.prototype.refresh = function () {
        this.length = this.data.length;
        this.isEmpty = (this.data.length == 0);
    };
    Heap.prototype.heapify = function () {
        this.data.forEach(function (value, index) { value.index = index; });
        for (var i = Math.floor(this.length / 2) - 1; i >= 0; ++i) {
            this.siftDownRecursively(i);
        }
    };
    Heap.prototype.siftUp = function (index) {
        if (index < 0 || index >= this.length)
            return index;
        var p = this.parent(index);
        var c = this.data[index];
        if (p != null && c != null && p.priority < c.priority) {
            this.swap(p, c);
        }
        return c.index;
    };
    Heap.prototype.siftUpRecursively = function (index) {
        var c = index;
        do {
            index = c;
            c = this.siftUp(index);
        } while (c != index);
        return c;
    };
    Heap.prototype.siftDownRecursively = function (index) {
        var c = index;
        do {
            index = c;
            c = this.siftDown(index);
        } while (c != index);
        return c;
    };
    Heap.prototype.siftDown = function (index) {
        if (index < 0 || index >= this.length)
            return index;
        var p = this.data[index];
        var c = this.maxChild(index);
        if (c == null || p.priority >= c.priority) {
            return index;
        }
        else {
            this.swap(p, c);
            return p.index;
        }
    };
    Heap.prototype.swap = function (parent, child) {
        if (parent != null && child != null && this.parent(child.index) == parent) {
            var pi = parent.index;
            var ci = child.index;
            parent.index = ci;
            child.index = pi;
            this.data[pi] = child;
            this.data[ci] = parent;
        }
    };
    Heap.prototype.maxChild = function (index) {
        if (index < 0 || index >= this.length)
            return null;
        var l = this.left(index);
        var r = this.right(index);
        if (l == null)
            return null;
        else if (r == null)
            return l;
        else if (r.priority > l.priority)
            return r;
        else
            return l;
    };
    Heap.prototype.children = function (index) {
        return { left: this.left(index), right: this.right(index) };
    };
    Heap.prototype.parent = function (index) {
        if (index == 0 || index >= this.length) {
            return null;
        }
        else {
            return this.data[Math.floor((index + 1) / 2) - 1];
        }
    };
    Heap.prototype.left = function (index) {
        if (index < 0 || index >= this.length)
            return null;
        var li = 2 * index + 1;
        if (li < 0 || li >= this.length)
            return null;
        else
            return this.data[li];
    };
    Heap.prototype.right = function (index) {
        if (index < 0 || index >= this.length)
            return null;
        var ri = 2 * index + 2;
        if (ri < 0 || ri >= this.length)
            return null;
        else
            return this.data[ri];
    };
    return Heap;
}());
function makePriorityQueue(elems, priorities) {
    var entries = elems.map(function (elem, index) {
        return {
            index: index,
            priority: priorities.length > index ? priorities[index] : 0,
            elem: elem
        };
    });
    return new Heap(entries);
}
exports.makePriorityQueue = makePriorityQueue;
function wrapPriorityQueueData(data) {
    return new Heap(data);
}
exports.wrapPriorityQueueData = wrapPriorityQueueData;
function tryCatch(f, action) {
    try {
        f();
    }
    catch (e) {
        console.log("Caught error while " + action);
        if (e.message !== undefined)
            console.log(e.message);
        if (e.stackTrace !== undefined)
            console.log(e.stackTrace);
    }
}
exports.tryCatch = tryCatch;
