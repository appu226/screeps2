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