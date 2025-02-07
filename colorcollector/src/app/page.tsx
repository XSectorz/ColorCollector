"use client";
import { useState } from "react";
import { Icon } from "@iconify/react";

interface Performance {

  runTime: number;
  memUsage: number;

}

export default function Home() {
  const numRows = 30;
  const numCols = 80;

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [selectState, setSelectState] = useState<string>("WALL");
  const [startPos, setStartPos] = useState<[number, number]>([13, 20]);
  const [endPos, setEndPos] = useState<[number, number]>([13, 50]);
  const [isPlaying,setIsPlaying] = useState<boolean>(false);
  const [blindSearchPerformance, setBlindSearchPerformance] = useState<Performance>({runTime: 0, memUsage: 0});
  const [heuristicPerformance, setHeuristicSearchPerformance] = useState<Performance>({runTime: 0, memUsage: 0});
  const [animationFrameId, setAnimationFrameId] = useState<number|null>(null);

  const [grid, setGrid] = useState(
    Array.from({ length: numRows }, () => Array(numCols).fill(0))
  );

  const handleMouseDown = (row: number, col: number) => {
    if(isPlaying) return;
    const newGrid = [...grid];
    clearBoard();
    if (selectState === "WALL") {
      if (row === endPos[0] && col === endPos[1]) return;
      if (row === startPos[0] && col === startPos[1]) return;
      newGrid[row][col] = newGrid[row][col] === 1 ? 0 : 1;
      setIsMouseDown(true);
    } else if (selectState === "START") {
      if (startPos) newGrid[startPos[0]][startPos[1]] = 0;
      if (row === endPos[0] && col === endPos[1]) return;
      newGrid[row][col] = 2;
      setStartPos([row, col]);
    } else if (selectState === "END") {
      if (endPos) newGrid[endPos[0]][endPos[1]] = 0;
      if (row === startPos[0] && col === startPos[1]) return;
      newGrid[row][col] = 3;
      setEndPos([row, col]);
    }

    setGrid(newGrid);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if(isPlaying) return;
    if (!isMouseDown || selectState !== "WALL") return;
    if (row === endPos[0] && col === endPos[1]) return;
    if (row === startPos[0] && col === startPos[1]) return;
    const newGrid = [...grid];
    newGrid[row][col] = newGrid[row][col] === 0 ? 1 : 0;
    setGrid(newGrid);
  };

  const handleClickChangeState = (type: string) => {
    setSelectState(type);
  };

  const clearBoard = () => {
    const newGrid = [...grid];

    newGrid.map((row,rowindex) => {
      newGrid[rowindex].map((col,colindex) => {

        if(newGrid[rowindex][colindex] !== 1) {
          newGrid[rowindex][colindex] = 0;
        }
      })
    })

    setGrid(newGrid);

  }

  const handleFindPath = () => {
    setIsPlaying(true);
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }

    const windowPerformance = window.performance as any;
    let totalMemory = windowPerformance.memory.usedJSHeapSize;
    const startTime = performance.now(); 
  
    console.log("Start path");
    clearBoard(); 
  
    const newGrid = [...grid];
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0], // 4 ทิศทาง: ขวา, ล่าง, ซ้าย, ขึ้น
    ];
    const queue: Array<[number, number]> = [startPos];
    const visited = Array.from({ length: numRows }, () => Array(numCols).fill(false));
    const parent: Array<Array<[number, number] | null>> = Array.from({ length: numRows }, () =>
      Array(numCols).fill(null)
    );
  
    visited[startPos[0]][startPos[1]] = true;
    newGrid[startPos[0]][startPos[1]] = 10;
    let queueIndex = 0;
    let foundEnd = false;
  
    const processStep = () => {

      const windowPerformance = window.performance as any;
      totalMemory = (totalMemory + windowPerformance.memory.usedJSHeapSize)/2;

      console.log(totalMemory);

      if (queueIndex >= queue.length || foundEnd) {
        const endTime = performance.now();
        console.log(`Runtime: ${endTime - startTime} ms`);
        setBlindSearchPerformance({
          runTime: endTime - startTime,
          memUsage: totalMemory
        })  
        setIsPlaying(false);
        return;
      }
  
      const [row, col] = queue[queueIndex];
      queueIndex++;

      for (let [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
  
        if (
          newRow >= 0 &&
          newRow < numRows &&
          newCol >= 0 &&
          newCol < numCols &&
          !visited[newRow][newCol] &&
          grid[newRow][newCol] !== 1
        ) {
          visited[newRow][newCol] = true;
          queue.push([newRow, newCol]);
          parent[newRow][newCol] = [row, col];
          newGrid[newRow][newCol] = 10;
          if (newRow === endPos[0] && newCol === endPos[1]) {
            console.log("Found! NA");
            const endTime = performance.now();
            console.log(`Runtime: ${endTime - startTime} ms`);

            setBlindSearchPerformance({
              runTime: endTime - startTime,
              memUsage: totalMemory
            })  
            setIsPlaying(false);
            foundEnd = true;
            setGrid([...newGrid]);
            return;
          }
        }
      }
  
      setGrid([...newGrid]);
      const ID = requestAnimationFrame(processStep); 
      setAnimationFrameId(ID);
    };
  
    const ID = requestAnimationFrame(processStep);
    setAnimationFrameId(ID);
  };
  
  
  const handleFindPathWithHeuristic = () => {
    setIsPlaying(true);
    if (animationFrameId !== null) {
      // ยกเลิกการทำงานก่อนหน้า (หากมี)
      cancelAnimationFrame(animationFrameId);
    }
  
    // เริ่มจับเวลาและหน่วยความจำ
    const windowPerformance = window.performance as any;
    let totalMemory = windowPerformance.memory.usedJSHeapSize;
    const startTime = performance.now(); // เริ่มจับเวลา
  
    clearBoard();
    const newGrid = [...grid];
    const directions = [
      [0, 1], [1, 0], [0, -1], [-1, 0], // 4 ทิศทาง: ขวา, ล่าง, ซ้าย, ขึ้น
    ];
  
    const calculateHeuristic = (row: number, col: number) => {
      return Math.abs(row - endPos[0]) + Math.abs(col - endPos[1]);
    };
  
    const queue: Array<{ row: number, col: number, g: number, h: number, f: number, parent: [number, number] | null }> = [];
    const visited = Array.from({ length: numRows }, () => Array(numCols).fill(false));
    const parent: Array<Array<[number, number] | null>> = Array.from({ length: numRows }, () =>
      Array(numCols).fill(null)
    );
  
    queue.push({ row: startPos[0], col: startPos[1], g: 0, h: calculateHeuristic(startPos[0], startPos[1]), f: 0, parent: null });
    visited[startPos[0]][startPos[1]] = true;
    newGrid[startPos[0]][startPos[1]] = 10;
    let foundEnd = false;
  
    const processStep = () => {

      const windowPerformance = window.performance as any;
      totalMemory = (totalMemory + windowPerformance.memory.usedJSHeapSize)/2;
      console.log(totalMemory);
      if (queue.length === 0 || foundEnd) {
        const endTime = performance.now();  // จับเวลาเมื่อเสร็จสิ้น
        console.log(`Runtime: ${endTime - startTime} ms`);
  
        setHeuristicSearchPerformance({
          runTime: endTime - startTime,
          memUsage: totalMemory
        }) 
        setIsPlaying(false);
  
        return;
      }
  
      const current = queue.sort((a, b) => a.f - b.f).shift()!;
      const { row, col, g, h, parent: currentParent } = current;
  
      if (row === endPos[0] && col === endPos[1]) {
        foundEnd = true;
        setGrid([...newGrid]);
        const endTime = performance.now();
        console.log(`Runtime: ${endTime - startTime} ms`);
        setHeuristicSearchPerformance({
          runTime: endTime - startTime,
          memUsage: totalMemory
        }) 
        setIsPlaying(false);
        return;
      }
  
      for (let [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (
          newRow >= 0 &&
          newRow < numRows &&
          newCol >= 0 &&
          newCol < numCols &&
          !visited[newRow][newCol] &&
          grid[newRow][newCol] !== 1
        ) {
          visited[newRow][newCol] = true;
          const newG = g + 1;
          const newH = calculateHeuristic(newRow, newCol);
          const newF = newG + newH;
          queue.push({
            row: newRow,
            col: newCol,
            g: newG,
            h: newH,
            f: newF,
            parent: [row, col]
          });
          newGrid[newRow][newCol] = 10;
        }
      }
  
      setGrid([...newGrid]);
      const ID = requestAnimationFrame(processStep); 
      setAnimationFrameId(ID);
    };
  
    const ID = requestAnimationFrame(processStep); 
    setAnimationFrameId(ID);
  };
  
  

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-center items-center w-full">HEADER</div>
      <div className="flex gap-x-5 flex-row mt-5 justify-center items-center">
        <div
          className={`flex flex-row px-2 py-1 rounded-md border border-gray-600 ${
            selectState == "WALL" ? " bg-gray-300" : "cursor-pointer hover:bg-gray-200"
          }`}
          onClick={() => handleClickChangeState("WALL")}
        >
          <div className="flex justify-center items-center mr-1">
            <Icon icon="memory:wall-fill" width={20} height={20} />
          </div>
          <div className="flex justify-center items-center">Wall</div>
        </div>
        <div
          className={`flex flex-row px-2 py-1 rounded-md border border-gray-600 ${
            selectState == "START" ? " bg-gray-300" : "cursor-pointer hover:bg-gray-200"
          }`}
          onClick={() => handleClickChangeState("START")}
        >
          <div className="flex justify-center items-center">
            <Icon icon="material-symbols:play-arrow-rounded" width={20} height={20} />
          </div>
          <div className="flex justify-center items-center">Start</div>
        </div>
        <div
          className={`flex flex-row px-2 py-1 rounded-md border border-gray-600 ${
            selectState == "END" ? " bg-gray-300" : "cursor-pointer hover:bg-gray-200"
          }`}
          onClick={() => handleClickChangeState("END")}
        >
          <div className="flex justify-center items-center mr-1">
            <Icon icon="material-symbols:flag-rounded" width={20} height={20} />
          </div>
          <div className="flex justify-center items-center">End</div>
        </div>
      </div>
      <div className="flex flex-row gap-x-5 mt-5 w-full justify-center">
          <div className="flex px-2 py-1 rounded-md text-white cursor-pointer bg-green-600 hover:bg-green-500" onClick={handleFindPath}>
            Blind Search
          </div>
          <div className="flex px-2 py-1 rounded-md text-white cursor-pointer bg-red-600 hover:bg-red-500" onClick={handleFindPathWithHeuristic}>
            Heuristic Search
          </div>
      </div>
      <div className="flex mt-12 justify-center items-center w-full">
        <table
          className="border border-collapse border-black w-full"
          onMouseUp={() => setIsMouseDown(false)}
        >
          <tbody>
            {grid.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`w-6 h-6 cursor-pointer border border-black ${
                      cell === 1
                        ? "bg-black"
                        : cell === 10
                        ? "bg-blue-400" 
                        : "bg-white hover:bg-gray-300"
                    }`}
                    onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  >
                    {rowIndex === startPos[0] && colIndex === startPos[1] && (
                      <div className="flex w-full h-full justify-center items-center">
                        <Icon
                          icon="material-symbols:play-arrow-rounded"
                          width={20}
                          height={20}
                        />
                      </div>
                    )}
                    {rowIndex === endPos[0] && colIndex === endPos[1] && (
                      <div className="flex justify-center items-center">
                        <Icon
                          icon="material-symbols:flag-rounded"
                          width={20}
                          height={20}
                        />
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex w-full flex-row justify-center gap-x-20">
          <div className="flex flex-row gap-x-2 mt-2 bg-green-500 rounded-full px-3 py-1">
              <div className="flex">
                  Blind Search:
              </div>
              <div className="flex">
                {Math.round(blindSearchPerformance.runTime)} ms
              </div>
              <div className="flex">
                  {Math.round(blindSearchPerformance.memUsage/1000)} kbytes
              </div>
          </div>
          <div className="flex flex-row gap-x-2 mt-2 bg-red-500 rounded-full px-3 py-1">
              <div className="flex">
                  Heuristic Search:
              </div>
              <div className="flex">
                  {Math.round(heuristicPerformance.runTime)} ms
              </div>
              <div className="flex">
                {Math.round(heuristicPerformance.memUsage/1000)} kbytes
              </div>
          </div>
      </div>
    </div>
  );
}
