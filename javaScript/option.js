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
    QueueImpl.prototype.count = function (f) {
        var helper = function (arr) {
            return arr.reduce(function (prev, curr) { return f(curr) ? prev + 1 : prev; }, 0);
        };
        return helper(this.pushStack) + helper(this.popStack);
    };
    QueueImpl.prototype.toArray = function () {
        var result = [];
        for (var i = this.popStack.length - 1; i >= 0; --i)
            result.push(this.popStack[i]);
        for (var i = 0; i < this.pushStack.length; ++i)
            result.push(this.pushStack[i]);
        return result;
    };
    QueueImpl.prototype.filter = function (f) {
        return new QueueImpl(this.pushStack.filter(function (value) { return f(value); }), this.popStack.filter((function (value) { return f(value); })));
    };
    QueueImpl.prototype.map = function (f) {
        return new QueueImpl(this.pushStack.map(function (value) { return f(value); }), this.popStack.map(function (value) { return f(value); }));
    };
    QueueImpl.prototype.find = function (f) {
        for (var i = this.popStack.length - 1; i >= 0; --i)
            if (f(this.popStack[i]))
                return Some(this.popStack[i]);
        for (var i = 0; i < this.pushStack.length; ++i)
            if (f(this.pushStack[i]))
                return Some(this.pushStack[i]);
        return None();
    };
    QueueImpl.prototype.extract = function (f) {
        for (var i = this.popStack.length - 1; i >= 0; --i)
            if (f(this.popStack[i]))
                return Some(this.popStack.splice(i, 1)[0]);
        for (var i = 0; i < this.pushStack.length; ++i)
            if (f(this.pushStack[i]))
                return Some(this.pushStack.splice(i, 1)[0]);
        return None();
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
function flatten(arr) {
    var res = [];
    arr.forEach(function (ar) { return ar.forEach(function (a) { return res.push(a); }); });
    return res;
}
exports.flatten = flatten;
function sum(arr) {
    return arr.reduce(function (prev, curr) { return prev + curr; }, 0);
}
exports.sum = sum;
function findIndexOf(arr, filter) {
    for (var i = 0; i < arr.length; ++i) {
        if (filter(arr[i]))
            return Some(i);
    }
    return None();
}
exports.findIndexOf = findIndexOf;
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
            result = Some(this.data.pop().elem);
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
        for (var i = Math.floor(this.length / 2) - 1; i >= 0; --i) {
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
        if (e.stack !== undefined)
            console.log(e.stack);
    }
}
exports.tryCatch = tryCatch;
function tokenize(comboString, delim) {
    var i = 0;
    var result = [];
    while (i < comboString.length) {
        if (comboString[i] == delim[0]) {
            result.push("");
        }
        else if (i == 0) {
            result.push(comboString[i].toString());
        }
        else {
            result[result.length - 1] += comboString[i];
        }
        ++i;
    }
    return result;
}
exports.tokenize = tokenize;
var DLListImpl = (function () {
    function DLListImpl(arr) {
        var _this = this;
        this.length = 0;
        this.isEmpty = true;
        this.frontEntry = None();
        this.backEntry = this.frontEntry;
        arr.forEach(function (elem) { return _this.push_back(elem); });
    }
    DLListImpl.prototype.remove = function (entry) {
        if (entry.prev.isPresent)
            entry.prev.get.next = entry.next;
        else
            this.frontEntry = entry.next;
        if (entry.next.isPresent)
            entry.next.get.prev = entry.prev;
        else
            this.backEntry = entry.prev;
        --(this.length);
        this.isEmpty = (this.length == 0);
        return entry.elem;
    };
    DLListImpl.prototype.insert = function (elem, left, right) {
        var optEntry = Some({
            elem: elem,
            prev: left,
            next: right
        });
        if (left.isPresent)
            left.get.next = optEntry;
        else
            this.frontEntry = optEntry;
        if (right.isPresent)
            right.get.prev = optEntry;
        else
            this.backEntry = optEntry;
        ++(this.length);
        this.isEmpty = false;
        return optEntry.get;
    };
    DLListImpl.prototype.push_front = function (elem) {
        this.insert(elem, None(), this.frontEntry);
    };
    DLListImpl.prototype.pop_front = function () {
        if (this.frontEntry.isPresent) {
            return this.remove(this.frontEntry.get);
        }
        else
            throw new Error("Cannot pop front from empty DLList");
    };
    DLListImpl.prototype.front = function () {
        if (this.frontEntry.isPresent)
            return this.frontEntry.get.elem;
        else
            throw new Error("Cannot get front from empty DLList");
    };
    DLListImpl.prototype.push_back = function (elem) {
        this.insert(elem, this.backEntry, None());
    };
    DLListImpl.prototype.pop_back = function () {
        if (this.backEntry.isPresent)
            return this.remove(this.backEntry.get);
        else
            throw new Error("Cannot pop back from empty DLList");
    };
    DLListImpl.prototype.back = function () {
        if (this.isEmpty)
            throw new Error("Cannot get back from empty DLList");
        else
            return this.backEntry.get.elem;
    };
    DLListImpl.prototype.find = function (func, findFromReverse) {
        var res = None();
        for (var iter = findFromReverse ? this.backEntry : this.frontEntry; iter.isPresent && !res.isPresent; iter = findFromReverse ? iter.get.prev : iter.get.next) {
            if (func(iter.get.elem))
                res = Some(iter.get.elem);
        }
        return res;
    };
    DLListImpl.prototype.extract = function (func, extractFromReverse) {
        var res = None();
        for (var iter = extractFromReverse ? this.backEntry : this.frontEntry; iter.isPresent && !res.isPresent; iter = extractFromReverse ? iter.get.prev : iter.get.next) {
            if (func(iter.get.elem)) {
                res = Some(iter.get.elem);
                this.remove(iter.get);
            }
        }
        return res;
    };
    DLListImpl.prototype.extractAll = function (func) {
        var res = [];
        for (var iter = this.frontEntry; iter.isPresent; iter = iter.get.next) {
            if (func(iter.get.elem)) {
                res.push(iter.get.elem);
                this.remove(iter.get);
            }
        }
        return res;
    };
    DLListImpl.prototype.forEach = function (func) {
        for (var iter = this.frontEntry; iter.isPresent; iter = iter.get.next)
            func(iter.get);
    };
    DLListImpl.prototype.toArray = function () {
        var res = [];
        for (var iter = this.frontEntry; iter.isPresent; iter = iter.get.next) {
            res.push(iter.get.elem);
        }
        return res;
    };
    return DLListImpl;
}());
function makeDLList(elems) {
    if (elems === void 0) { elems = []; }
    return new DLListImpl(elems);
}
exports.makeDLList = makeDLList;
