import o = require('./option');

function initMap(totalRows: number, totalCols: number): PQEntry<XY>[][] {
    let result: PQEntry<XY>[][] = [];
    for (let r = 0; r < totalRows; ++r) {
        result.push([]);
        for (let c = 0; c < totalCols; ++c) {
            result[r].push(null);
        }
    }
    return result;
}

function initPq(startingPoints: XY[], map: PQEntry<XY>[][]): PQ<XY> {
    let pq = o.makePriorityQueue<XY>([], []);
    for (let spi = 0; spi < startingPoints.length; ++spi) {
        let xy = startingPoints[spi];
        map[xy.x][xy.y] = pq.push({ x: xy.x, y: xy.y }, 0);
    }
    return pq;
}

export function searchMap(problem: MapSearchProblem): void {
    // do shortest path bfs
    // note that the priority queue is a max heap
    // so priority is set to (distance * -1)
    let map = initMap(problem.totalRows, problem.totalCols);
    let pq: PQ<XY> = initPq(problem.startingPoints(), map);
    while (!problem.isTerminated() && !pq.isEmpty) {
        // extract next elem
        let cell = pq.peek().get;
        let cellDistance = map[cell.x][cell.y].priority * -1;
        pq.pop();

        // process neighbors
        let nbrs = problem.expand(cell.x, cell.y);
        let nbrDistance = cellDistance + problem.cost(cell.x, cell.y);
        for (let nbri = 0; nbri < nbrs.length; ++nbri) {
            let nbr = nbrs[nbri];
            if (map[nbr.x][nbr.y] == null) {
                // visiting nbr for the first time
                map[nbr.x][nbr.y] = pq.push(nbr, -1 * nbrDistance);
            } else {
                // already visited nbr, but may need to reset distance of neighbor
                let knownPathLength = -1 * map[nbr.x][nbr.y].priority;
                if (knownPathLength > nbrDistance) {
                    pq.prioritize(map[nbr.x][nbr.y].index, -1 * nbrDistance);
                }
            }
        }
    }
}

class ConstructionSiteProblem implements MapSearchProblem {
    possibleConstructionSites: boolean[][];
    result: Option<XY>;
    totalRows: number;
    totalCols: number;
    startX: number;
    startY: number;
    checkNeighbors: boolean;

    constructor(possibleConstructionSites: boolean[][], startX: number, startY: number, checkNeighbors: boolean) {
        this.possibleConstructionSites = possibleConstructionSites;
        this.result = o.None<XY>();
        this.totalRows = possibleConstructionSites.length;
        this.totalCols = possibleConstructionSites[0].length;
        this.startX = startX;
        this.startY = startY;
        this.checkNeighbors = checkNeighbors;
    }

    cost(x: number, y: number): number {
        return 1;
    }
    expand(x: number, y: number): XY[] {
        let deltas = [-1, 0, 1];
        let nbrs: XY[] = [];
        this.checkForSolution(x, y)
        for (let dxi = 0; dxi < deltas.length; ++dxi) {
            for (let dyi = 0; dyi < deltas.length; ++dyi) {
                let newx = x + deltas[dxi];
                let newy = y + deltas[dyi];
                let notTheSame = newx != x || newy != y;
                if (notTheSame && this.isXyWithinBounds(newx, newy)) {
                    nbrs.push({ x: newx, y: newy });
                }
            }
        }
        return nbrs;
    }
    isXyWithinBounds(x: number, y: number): boolean {
        return x >= 0 && x < this.totalCols && y >= 0 && y < this.totalRows;
    }
    checkForSolution(x: number, y: number): void {
        if (this.isFree(x, y) && this.neighborsFree(x, y)
        )
            this.result = o.Some<XY>({ x: x, y: y });
    }
    isFree(x: number, y: number): boolean {
        return this.isXyWithinBounds(x, y) && this.possibleConstructionSites[x][y];
    }
    neighborsFree(x: number, y: number): boolean {
        return !this.checkNeighbors || (
            this.isFree(x + 1, y) && this.isFree(x - 1, y) &&
            this.isFree(x, y + 1) && this.isFree(x, y - 1));
    }
    startingPoints(): XY[] {
        return [{ x: this.startX, y: this.startY }];
    }
    isTerminated(): boolean {
        return this.result.isPresent;
    }
}

export function searchForConstructionSite(possibleConstructionSites: boolean[][]): Option<XY> {
    let problem = new ConstructionSiteProblem(
        possibleConstructionSites,
        possibleConstructionSites[0].length / 2,
        possibleConstructionSites.length / 2,
        true
    );
    searchMap(problem);
    return problem.result;
}

export function searchForContainerConstructionSite(possibleConstructionSites: boolean[][], startX: number, startY: number): Option<XY> {
    let problem = new ConstructionSiteProblem(possibleConstructionSites, startX, startY, false);
    searchMap(problem);
    return problem.result;
}