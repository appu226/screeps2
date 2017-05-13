"use strict";
function getValues(dictionary) {
    var result = [];
    for (var key in dictionary) {
        result.push(dictionary[key]);
    }
    return result;
}
exports.getValues = getValues;
function forEach(dictionary, func) {
    for (var key in dictionary) {
        func(key, dictionary[key]);
    }
    return;
}
exports.forEach = forEach;
