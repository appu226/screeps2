"use strict";
function sum(array) {
    var result = 0;
    for (var pos = 0; pos < array.length; ++pos) {
        result += array[pos];
    }
    return result;
}
exports.sum = sum;
function flatten(arrayOfArrays) {
    return arrayOfArrays.reduce(function (previousValue, currentValue) { return previousValue.concat(currentValue); }, []);
}
exports.flatten = flatten;
function maxBy(array, measure) {
    return array.reduce((function (previousValue, currentValue) {
        if (previousValue.isPresent && measure(previousValue.get) >= measure(currentValue))
            return previousValue;
        else
            return Some(currentValue);
    }), None());
}
exports.maxBy = maxBy;
function getOrInitObject(object, field) {
    if (object[field] === undefined) {
        object[field] = {};
    }
    return object[field];
}
exports.getOrInitObject = getOrInitObject;
var Option = (function () {
    function Option(elem, isP) {
        this.get = elem;
        this.isPresent = isP;
    }
    Option.prototype.toArray = function () {
        if (this.isPresent) {
            return [];
        }
        else {
            return [this.get];
        }
    };
    Option.prototype.map = function (f) {
        if (this.isPresent) {
            return Some(f(this.get));
        }
        else {
            return None();
        }
    };
    return Option;
}());
exports.Option = Option;
;
function Some(elem) {
    return new Option(elem, true);
}
exports.Some = Some;
function None() {
    return new Option(null, false);
}
exports.None = None;
function contains(array, elem) {
    return array.indexOf(elem) != -1;
}
exports.contains = contains;
function aToBStepC(a, b, c) {
    var result = [a];
    if (a == b) {
        return result;
    }
    else if (a < b) {
        if (c <= 0)
            return result;
        while (a + c <= b) {
            a = a + c;
            result.push(a);
        }
        return result;
    }
    else {
        if (c >= 0)
            return result;
        while (a + c >= b) {
            a = a + c;
            result.push(a);
        }
        return result;
    }
}
exports.aToBStepC = aToBStepC;
