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

export function arrayToDictionary<TElem>(array: TElem[], keyFunc: (TElem) => string): Dictionary<TElem[]> {
    let result: Dictionary<TElem[]> = {};
    for(let i = 0; i < array.length; ++i) {
        let elem = array[i];
        let key = keyFunc(elem);
        if (result[key] === undefined) result[key] = [];
        result[key].push(elem);
    }
    return result;
}

export function mapValues<TElem, TNewElem>(dict: Dictionary<TElem>, mapFunc: (TElem) => TNewElem): Dictionary<TNewElem> {
    let result: Dictionary<TNewElem> = {};
    for(let key in dict) {
        result[key] = mapFunc(dict[key]);
    }
    return result;
}