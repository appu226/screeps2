"use strict";
var o = require("./option");
function initMap(totalRows, totalCols) {
    var result = [];
    for (var r = 0; r < totalRows; ++r) {
        result.push([]);
        for (var c = 0; c < totalCols; ++c) {
            result[r].push(null);
        }
    }
    return result;
}
function initPq(startingPoints, map) {
    var pq = o.makePriorityQueue([], []);
    for (var spi = 0; spi < startingPoints.length; ++spi) {
        var xy = startingPoints[spi];
        map[xy.x][xy.y] = pq.push({ x: xy.x, y: xy.y }, 0);
    }
    return pq;
}
function searchMap(problem) {
    // do shortest path bfs
    // note that the priority queue is a max heap
    // so priority is set to (distance * -1)
    var map = initMap(problem.totalRows, problem.totalCols);
    var pq = initPq(problem.startingPoints(), map);
    while (!problem.isTerminated() && !pq.isEmpty) {
        // extract next elem
        var cell = pq.peek().get;
        var cellDistance = map[cell.x][cell.y].priority * -1;
        pq.pop();
        // process neighbors
        var nbrs = problem.expand(cell.x, cell.y);
        var nbrDistance = cellDistance + problem.cost(cell.x, cell.y);
        for (var nbri = 0; nbri < nbrs.length; ++nbri) {
            var nbr = nbrs[nbri];
            if (map[nbr.x][nbr.y] == null) {
                // visiting nbr for the first time
                map[nbr.x][nbr.y] = pq.push(nbr, -1 * nbrDistance);
            }
            else {
                // already visited nbr, but may need to reset distance of neighbor
                var knownPathLength = -1 * map[nbr.x][nbr.y].priority;
                if (knownPathLength > nbrDistance) {
                    pq.prioritize(map[nbr.x][nbr.y].index, -1 * nbrDistance);
                }
            }
        }
    }
}
exports.searchMap = searchMap;
var ConstructionSiteProblem = (function () {
    function ConstructionSiteProblem(possibleConstructionSites, startX, startY, checkNeighbors) {
        this.possibleConstructionSites = possibleConstructionSites;
        this.result = o.None();
        this.totalRows = possibleConstructionSites[0].length;
        this.totalCols = possibleConstructionSites.length;
        this.startX = startX;
        this.startY = startY;
        this.checkNeighbors = checkNeighbors;
    }
    ConstructionSiteProblem.prototype.cost = function (x, y) {
        return 1;
    };
    ConstructionSiteProblem.prototype.expand = function (x, y) {
        var deltas = [-1, 0, 1];
        var nbrs = [];
        this.checkForSolution(x, y);
        for (var dxi = 0; dxi < deltas.length; ++dxi) {
            for (var dyi = 0; dyi < deltas.length; ++dyi) {
                var newx = x + deltas[dxi];
                var newy = y + deltas[dyi];
                var notTheSame = newx != x || newy != y;
                if (notTheSame && this.isXyWithinBounds(newx, newy)) {
                    nbrs.push({ x: newx, y: newy });
                }
            }
        }
        return nbrs;
    };
    ConstructionSiteProblem.prototype.isXyWithinBounds = function (x, y) {
        return x >= 0 && x < this.totalCols && y >= 0 && y < this.totalRows;
    };
    ConstructionSiteProblem.prototype.checkForSolution = function (x, y) {
        if (this.isFree(x, y) && this.neighborsFree(x, y))
            this.result = o.Some({ x: x, y: y });
    };
    ConstructionSiteProblem.prototype.isFree = function (x, y) {
        return this.isXyWithinBounds(x, y) && this.possibleConstructionSites[x][y];
    };
    ConstructionSiteProblem.prototype.neighborsFree = function (x, y) {
        return !this.checkNeighbors || (this.isFree(x + 1, y) && this.isFree(x - 1, y) &&
            this.isFree(x, y + 1) && this.isFree(x, y - 1));
    };
    ConstructionSiteProblem.prototype.startingPoints = function () {
        return [{ x: this.startX, y: this.startY }];
    };
    ConstructionSiteProblem.prototype.isTerminated = function () {
        return this.result.isPresent;
    };
    return ConstructionSiteProblem;
}());
function searchForConstructionSite(possibleConstructionSites) {
    var problem = new ConstructionSiteProblem(possibleConstructionSites, possibleConstructionSites[0].length / 2, possibleConstructionSites.length / 2, true);
    searchMap(problem);
    return problem.result;
}
exports.searchForConstructionSite = searchForConstructionSite;
function searchForContainerConstructionSite(possibleConstructionSites, startX, startY) {
    var problem = new ConstructionSiteProblem(possibleConstructionSites, startX, startY, false);
    searchMap(problem);
    return problem.result;
}
exports.searchForContainerConstructionSite = searchForContainerConstructionSite;
