"use strict";
var StorageWrapper = (function () {
    function StorageWrapper(storage) {
        this.element = storage;
        this.my = storage.my;
        this.resourceRequests = [];
    }
    StorageWrapper.prototype.process = function (pv) {
    };
    StorageWrapper.prototype.giveResourceToCreep = function (creep, resourceType, amount) {
        return creep.withdraw(this.element, resourceType, amount);
    };
    StorageWrapper.prototype.takeResourceFromCreep = function (creep, resourceType, amount) {
        return creep.transfer(this.element, resourceType, amount);
    };
    return StorageWrapper;
}());
function makeStorageWrapper(storage) {
    return new StorageWrapper(storage);
}
exports.makeStorageWrapper = makeStorageWrapper;
