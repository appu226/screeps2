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
function arrayToDictionary(array, keyFunc) {
    var result = {};
    for (var i = 0; i < array.length; ++i) {
        var elem = array[i];
        var key = keyFunc(elem);
        if (result[key] === undefined)
            result[key] = [];
        result[key].push(elem);
    }
    return result;
}
exports.arrayToDictionary = arrayToDictionary;
function mapValues(dict, mapFunc) {
    var result = {};
    for (var key in dict) {
        result[key] = mapFunc(dict[key]);
    }
    return result;
}
exports.mapValues = mapValues;
