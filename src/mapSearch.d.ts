declare interface MapSearchProblem {
    cost(x: number, y: number): number;
    expand(x: number, y: number): XY[];
    startingPoints(): XY[];
    isTerminated(): boolean;
    totalRows: number;
    totalCols: number
}
