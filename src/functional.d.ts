declare interface Option<TElem> {
    isPresent: boolean;
    get: TElem;
}

type Dictionary<TElem> = { [key: string]: TElem };

declare interface QueueData<TElem> {
    pushStack: TElem[];
    popStack: TElem[];
}

declare interface Queue<TElem> {
    push(elem: TElem): void;
    pop(): Option<TElem>;
    peek(): Option<TElem>;
    length(): number;
    isEmpty(): boolean;
    toArray(): TElem[];
    count(f: (TElem) => boolean): number;
    filter(f: (TElem) => boolean): Queue<TElem>;
    map<TNew>(f: (TElem) => TNew): Queue<TNew>;
    find(f: (TElem) => boolean): Option<TElem>;
    extract(f: (TElem) => boolean): Option<TElem>;
}

declare interface PQEntry<TElem> {
    index: number;
    priority: number;
    elem: TElem;
}

declare interface PQ<TElem> {
    push(elem: TElem, priority: number): PQEntry<TElem>;
    pop(): Option<TElem>;
    peek(): Option<TElem>;
    length: number;
    isEmpty: boolean;
    prioritize(index: number, priority: number): Option<PQEntry<TElem>>;
}

declare interface DLListEntry<TElem> {
    next: Option<DLListEntry<TElem>>;
    prev: Option<DLListEntry<TElem>>;
    elem: TElem;
}

declare interface DLList<TElem> {
    length: number;
    isEmpty: boolean;
    frontEntry: Option<DLListEntry<TElem>>
    backEntry: Option<DLListEntry<TElem>>

    insert(elem: TElem, left: Option<DLListEntry<TElem>>, right: Option<DLListEntry<TElem>>): DLListEntry<TElem>;
    remove(entry: DLListEntry<TElem>): TElem;

    push_front(elem: TElem): void;
    pop_front(): TElem;
    front(): TElem;

    push_back(elem: TElem): void;
    pop_back(): TElem;
    back(): TElem;

    find(func: (TElem) => boolean, findFromReverse: boolean): Option<TElem>;
    extract(func: (TElem) => boolean, extractFromReverse: boolean): Option<TElem>;
    extractAll(func: (TElem) => boolean): TElem[];
    forEach(func: (entry: DLListEntry<TElem>) => void): void;

    toArray(): TElem[];
}