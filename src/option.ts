export function None<TElem>(): Option<TElem> {
    return {
        get: null,
        isPresent: false
    };
}

export function Some<TElem>(elem: TElem): Option<TElem> {
    return {
        get: elem,
        isPresent: true
    };
}

class QueueImpl<TElem> implements Queue<TElem>
{
    constructor(pushStack: TElem[], popStack: TElem[]) {
        this.pushStack = pushStack;
        this.popStack = popStack;
    }

    pushStack: TElem[];
    popStack: TElem[];
    push(elem: TElem) {
        this.pushStack.push(elem);
    }
    pop(): Option<TElem> {
        if (this.popStack.length == 0) {
            while (this.pushStack.length > 0) {
                this.popStack.push(this.pushStack.pop());
            }
        }
        if (this.popStack.length > 0) {
            return Some<TElem>(this.popStack.pop());
        } else {
            return None<TElem>();
        }
    }
    peek(): Option<TElem> {
        if (this.popStack.length == 0) {
            while (this.pushStack.length > 0) {
                this.popStack.push(this.pushStack.pop());
            }
        }
        if (this.popStack.length > 0) {
            return Some<TElem>(this.popStack[this.popStack.length - 1]);
        } else {
            return None<TElem>();
        }
    }
    length(): number {
        return this.pushStack.length + this.popStack.length;
    }
    isEmpty(): boolean {
        return this.length() == 0;
    }
    count(f: (TElem) => boolean): number {
        let helper = function (arr: TElem[]): number {
            return arr.reduce<number>((prev: number, curr: TElem) => f(curr) ? prev + 1 : prev, 0);
        }
        return helper(this.pushStack) + helper(this.popStack);
    }
    toArray(): TElem[] {
        let result: TElem[] = [];
        for (let i = this.popStack.length - 1; i >= 0; --i)
            result.push(this.popStack[i]);
        for (let i = 0; i < this.pushStack.length; ++i)
            result.push(this.pushStack[i]);
        return result;
    }
    filter(f: (TElem) => boolean): Queue<TElem> {
        return new QueueImpl<TElem>(this.pushStack.filter((value) => f(value)), this.popStack.filter((value => f(value))));
    }
    map<TNew>(f: (TElem) => TNew): Queue<TNew> {
        return new QueueImpl<TNew>(this.pushStack.map<TNew>((value) => f(value)), this.popStack.map<TNew>((value) => f(value)));
    }
    find(f: (TElem) => boolean): Option<TElem> {
        for (let i = this.popStack.length - 1; i >= 0; --i)
            if (f(this.popStack[i])) return Some<TElem>(this.popStack[i]);
        for (let i = 0; i < this.pushStack.length; ++i)
            if (f(this.pushStack[i])) return Some<TElem>(this.pushStack[i]);
        return None<TElem>();
    }
    extract(f: (TElem) => boolean): Option<TElem> {
        for (let i = this.popStack.length - 1; i >= 0; --i)
            if (f(this.popStack[i]))
                return Some<TElem>(
                    this.popStack.splice(i, 1)[0]
                );
        for (let i = 0; i < this.pushStack.length; ++i)
            if (f(this.pushStack[i]))
                return Some<TElem>(
                    this.pushStack.splice(i, 1)[0]
                );
        return None<TElem>();
    }
}

export function makeQueue<TElem>(pushStack: TElem[], popStack: TElem[] = []): Queue<TElem> {
    return new QueueImpl(pushStack, popStack);
}

export function countElemsInDictionary<TElem>(dictionary: Dictionary<TElem>, filter: (TElem) => boolean): number {
    var result: number = 0;
    for (var name in dictionary) {
        if (filter(dictionary[name]))
            ++result;
    }
    return result;
}

export function maxBy<TElem>(collection: TElem[], measure: (TElem) => number): Option<{ elem: TElem, measure: number }> {
    type Result = { elem: TElem, measure: number };
    var results: Result[] = collection.map((elem: TElem) => { return { elem: elem, measure: measure(elem) }; })
    return results.reduce(
        (prevValue: Option<Result>, currentValue: Result) => {
            if (prevValue.isPresent && prevValue.get.measure > currentValue.measure) {
                return prevValue;
            } else {
                return Some<Result>(currentValue);
            }
        },
        None<Result>()
    );
}

export function flatten<TElem>(arr: TElem[][]): TElem[] {
    let res: TElem[] = [];
    arr.forEach(ar => ar.forEach(a => res.push(a)));
    return res;
}

export function sum(arr: number[]): number {
    return arr.reduce((prev, curr) => prev + curr, 0);
}

export function findIndexOf<TElem>(arr: TElem[], filter: (TElem) => boolean): Option<number> {
    for (let i = 0; i < arr.length; ++i) {
        if (filter(arr[i]))
            return Some<number>(i);
    }
    return None<number>();
}

class Heap<TElem> implements PQ<TElem> {
    length: number;
    isEmpty: boolean;

    constructor(elems: PQEntry<TElem>[]) {
        this.data = elems;
        this.refresh();
        this.heapify();
    }

    push(elem: TElem, priority: number): PQEntry<TElem> {
        var entry: PQEntry<TElem> = {
            index: this.length,
            priority: priority,
            elem: elem
        };
        this.data.push(entry);
        this.refresh();
        this.siftUpRecursively(entry.index);
        return entry;
    }

    pop(): Option<TElem> {
        var result: Option<TElem> = null;
        if (this.isEmpty) {
            return None<TElem>();
        } else if (this.length == 1) {
            result = Some<TElem>(this.data.pop().elem);
            this.refresh();
            return result;
        } else {
            var result = Some<TElem>(this.data[0].elem);
            this.data[0] = this.data.pop();
            this.data[0].index = 0;
            this.refresh();
            this.siftDownRecursively(0);
            return result;
        }
    }

    peek(): Option<TElem> {
        if (this.isEmpty) {
            return None<TElem>();
        } else {
            return Some<TElem>(this.data[0].elem);
        }
    }

    prioritize(index: number, priority: number): Option<PQEntry<TElem>> {
        if (index < 0 || index >= this.length) {
            return None<PQEntry<TElem>>();
        } else {
            var entry = this.data[index];
            if (priority > entry.priority) {
                entry.priority = priority;
                this.siftUpRecursively(index);
            } else {
                entry.priority = priority;
                this.siftDownRecursively(index);
            }
            return Some<PQEntry<TElem>>(entry);
        }
    }

    private refresh(): void {
        this.length = this.data.length;
        this.isEmpty = (this.data.length == 0);
    }

    private heapify(): void {
        this.data.forEach((value, index) => { value.index = index; });
        for (var i = Math.floor(this.length / 2) - 1; i >= 0; --i) {
            this.siftDownRecursively(i);
        }
    }

    private siftUp(index: number): number {
        if (index < 0 || index >= this.length)
            return index;
        var p = this.parent(index);
        var c = this.data[index];
        if (p != null && c != null && p.priority < c.priority) {
            this.swap(p, c);
        }
        return c.index;
    }

    private siftUpRecursively(index: number): number {
        var c = index;
        do {
            index = c;
            c = this.siftUp(index);
        } while (c != index);
        return c;
    }

    private siftDownRecursively(index: number): number {
        var c = index;
        do {
            index = c;
            c = this.siftDown(index);
        } while (c != index);
        return c;
    }

    private siftDown(index: number): number {
        if (index < 0 || index >= this.length)
            return index;
        var p = this.data[index];
        var c = this.maxChild(index);
        if (c == null || p.priority >= c.priority) {
            return index;
        } else {
            this.swap(p, c);
            return p.index;
        }
    }

    private swap(parent: PQEntry<TElem>, child: PQEntry<TElem>): void {
        if (parent != null && child != null && this.parent(child.index) == parent) {
            var pi = parent.index;
            var ci = child.index;
            parent.index = ci;
            child.index = pi;
            this.data[pi] = child;
            this.data[ci] = parent;
        }
    }

    private maxChild(index: number): PQEntry<TElem> {
        if (index < 0 || index >= this.length)
            return null;
        var l = this.left(index);
        var r = this.right(index);
        if (l == null)
            return null;
        else if (r == null)
            return l;
        else if (r.priority > l.priority)
            return r;
        else
            return l;
    }

    private children(index: number): { left: PQEntry<TElem>, right: PQEntry<TElem> } {
        return { left: this.left(index), right: this.right(index) };
    }

    private parent(index: number): PQEntry<TElem> {
        if (index == 0 || index >= this.length) {
            return null;
        } else {
            return this.data[Math.floor((index + 1) / 2) - 1]
        }
    }

    private left(index: number): PQEntry<TElem> {
        if (index < 0 || index >= this.length)
            return null;
        var li = 2 * index + 1;
        if (li < 0 || li >= this.length)
            return null;
        else
            return this.data[li];
    }

    private right(index: number): PQEntry<TElem> {
        if (index < 0 || index >= this.length)
            return null;
        var ri = 2 * index + 2;
        if (ri < 0 || ri >= this.length)
            return null;
        else
            return this.data[ri];
    }

    data: PQEntry<TElem>[];
}

export function makePriorityQueue<TElem>(elems: TElem[], priorities: number[]): PQ<TElem> {
    var entries: PQEntry<TElem>[] = elems.map((elem, index) => {
        return {
            index: index,
            priority: priorities.length > index ? priorities[index] : 0,
            elem: elem
        }
    });
    return new Heap<TElem>(entries);
}

export function wrapPriorityQueueData<TElem>(data: PQEntry<TElem>[]): PQ<TElem> {
    return new Heap<TElem>(data);
}

export function tryCatch(f: () => void, action: string) {
    try {
        f();
    } catch (e) {
        console.log(`Caught error while ${action}`);
        if (e.message !== undefined) console.log(e.message);
        if (e.stackTrace !== undefined) console.log(e.stackTrace);
        if (e.stack !== undefined) console.log(e.stack);
    }
}

export function tokenize(comboString: string, delim: string): string[] {
    let i = 0;
    let result: string[] = [];
    while (i < comboString.length) {
        if (comboString[i] == delim[0]) {
            result.push("");
        } else if (i == 0) {
            result.push(comboString[i].toString());
        } else {
            result[result.length - 1] += comboString[i];
        }
        ++i;
    }
    return result;
}

class DLListImpl<TElem> implements DLList<TElem> {
    length: number;
    isEmpty: boolean;
    frontEntry: Option<DLListEntry<TElem>>;
    backEntry: Option<DLListEntry<TElem>>;

    constructor(arr: TElem[]) {
        this.length = 0;
        this.isEmpty = true;
        this.frontEntry = None<DLListEntry<TElem>>();
        this.backEntry = this.frontEntry;
        arr.forEach(elem => this.push_back(elem));
    }

    remove(entry: DLListEntry<TElem>): TElem {
        if (entry.prev.isPresent)
            entry.prev.get.next = entry.next;
        else
            this.frontEntry = entry.next;

        if (entry.next.isPresent)
            entry.next.get.prev = entry.prev;
        else
            this.backEntry = entry.prev;

        --(this.length);
        this.isEmpty = (this.length == 0);
        return entry.elem;
    }

    insert(elem: TElem, left: Option<DLListEntry<TElem>>, right: Option<DLListEntry<TElem>>): DLListEntry<TElem> {
        let optEntry = Some<DLListEntry<TElem>>({
            elem: elem,
            prev: left,
            next: right
        });
        if (left.isPresent)
            left.get.next = optEntry;
        else
            this.frontEntry = optEntry;

        if (right.isPresent)
            right.get.prev = optEntry;
        else
            this.backEntry = optEntry;
        ++(this.length);
        this.isEmpty = false;
        return optEntry.get;
    }

    push_front(elem: TElem): void {
        this.insert(elem, None<DLListEntry<TElem>>(), this.frontEntry);
    }
    pop_front(): TElem {
        if (this.frontEntry.isPresent) {
            return this.remove(this.frontEntry.get);
        } else
            throw new Error("Cannot pop front from empty DLList");
    }
    front(): TElem {
        if (this.frontEntry.isPresent)
            return this.frontEntry.get.elem;
        else
            throw new Error("Cannot get front from empty DLList");
    }

    push_back(elem: TElem): void {
        this.insert(elem, this.backEntry, None<DLListEntry<TElem>>());
    }
    pop_back(): TElem {
        if (this.backEntry.isPresent)
            return this.remove(this.backEntry.get);
        else
            throw new Error("Cannot pop back from empty DLList");
    }
    back(): TElem {
        if (this.isEmpty)
            throw new Error("Cannot get back from empty DLList");
        else
            return this.backEntry.get.elem;
    }

    find(func: (TElem) => boolean, findFromReverse: boolean): Option<TElem> {
        let res = None<TElem>();
        for (let iter = findFromReverse ? this.backEntry : this.frontEntry;
            iter.isPresent && !res.isPresent;
            iter = findFromReverse ? iter.get.prev : iter.get.next
        ) {
            if (func(iter.get.elem))
                res = Some(iter.get.elem);
        }
        return res;
    }
    extract(func: (TElem) => boolean, extractFromReverse: boolean): Option<TElem> {
        let res = None<TElem>();
        for (let iter = extractFromReverse ? this.backEntry : this.frontEntry;
            iter.isPresent && !res.isPresent;
            iter = extractFromReverse ? iter.get.prev : iter.get.next
        ) {
            if (func(iter.get.elem)) {
                res = Some(iter.get.elem);
                this.remove(iter.get);
            }
        }
        return res;
    }
    extractAll(func: (TElem) => boolean): TElem[] {
        let res: TElem[] = [];
        for (let iter = this.frontEntry; iter.isPresent; iter = iter.get.next) {
            if (func(iter.get.elem)) {
                res.push(iter.get.elem);
                this.remove(iter.get);
            }
        }
        return res;
    }
    forEach(func: (entry: DLListEntry<TElem>) => void): void {
        for (let iter = this.frontEntry; iter.isPresent; iter = iter.get.next)
            func(iter.get);
    }

    toArray(): TElem[] {
        let res: TElem[] = [];
        for (let iter = this.frontEntry; iter.isPresent; iter = iter.get.next) {
            res.push(iter.get.elem);
        }
        return res;
    }
}

export function makeDLList<TElem>(elems: TElem[] = []): DLList<TElem> {
    return new DLListImpl(elems);
}