export function sum(array: Array<number>): number {
    var result = 0;
    for (var pos = 0; pos < array.length; ++pos) {
        result += array[pos];
    }
    return result;
}
export function getOrInitObject(object: any, field: string): any {
    if (object[field] === undefined) {
        object[field] = {};
    }
    return object[field];
}