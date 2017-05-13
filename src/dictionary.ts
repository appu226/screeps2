export function getValues<TElem>(dictionary: Dictionary<TElem>): TElem[] {
    var result: TElem[] = [];
    for(var key in dictionary) {
        result.push(dictionary[key]);
    }
    return result;
}

export function forEach<TElem>(dictionary: Dictionary<TElem>, func: (key: string, value: TElem) => void): void {
    for(let key in dictionary) {
        func(key, dictionary[key]);
    }
    return;
}