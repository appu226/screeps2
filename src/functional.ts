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

export class Option<TElem> {
    
    get: TElem;
    isPresent: boolean;
    
    toArray(): Array<TElem> {
        if(this.isPresent) {
            return [];
        } else {
            return [this.get];
        }
    }
    
    map<TOut>(f: (elem: TElem) => TOut): Option<TOut> {
        if (this.isPresent) {
            return Some<TOut>(f(this.get));
        } else {
            return None<TOut>();
        }
    }
    
    constructor(elem: TElem, isP: boolean) {
        this.get = elem;
        this.isPresent = isP;
    }
};

export function Some<TElem>(elem): Option<TElem> {
    return new Option<TElem>(elem, true);
}

export function None<TElem>(): Option<TElem> {
    return new Option<TElem>(null, false);
}