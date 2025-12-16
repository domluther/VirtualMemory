import { useState } from 'react';
import { Monitor, HardDrive, Cpu } from 'lucide-react';

interface Program {
  id: string;
  name: string;
  size: number;
  color: string;
  removable: boolean;
  status?: string;
}

interface DraggedItem {
  item: Program;
  source: string;
}

const VirtualMemorySimulator = () => {
  const [gameState, setGameState] = useState('start'); // start, running, complete
  const [gameMode, setGameMode] = useState<'freestyle' | 'challenges' | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [ram, setRam] = useState<Program[]>([]);
  const [virtualMemory, setVirtualMemory] = useState<Program[]>([]);
  const [secondaryStorage, setSecondaryStorage] = useState<Program[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [programQueue, setProgramQueue] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState<string | React.ReactElement>('');
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [ramCapacity, setRamCapacity] = useState(4);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // Define challenge levels
  const CHALLENGE_LEVELS = [
    {
      level: 1,
      name: "Getting Started",
      ram: 8,
      description: "Learn the basics with plenty of RAM",
      programs: ['os', 'browser', 'email', 'music']
    },
    {
      level: 2,
      name: "Power User",
      ram: 8,
      description: "Run multiple large programs - you'll need virtual memory!",
      programs: ['os', 'browser', 'word', 'video', 'music', 'game']
    },
    {
      level: 3,
      name: "Gaming Session",
      ram: 8,
      description: "Launch many apps - virtual memory required",
      programs: ['os', 'browser', 'music', 'game', 'email', 'word']
    },
    {
      level: 4,
      name: "Limited Resources",
      ram: 8,
      description: "Manage memory carefully - virtual memory essential",
      programs: ['os', 'browser', 'word', 'email', 'music', 'video', 'game']
    },
    {
      level: 5,
      name: "Multitasking Master",
      ram: 4,
      description: "Master virtual memory with heavy multitasking",
      programs: ['os', 'browser', 'word', 'music', 'email', 'video']
    },
    {
      level: 6,
      name: "Minimal System",
      ram: 2,
      description: "Work with very limited RAM",
      programs: ['os', 'browser', 'email']
    },
    {
      level: 7,
      name: "Budget Computer",
      ram: 2,
      description: "Experience constant swapping on a budget system",
      programs: ['os', 'browser', 'music', 'browser', 'email', 'browser', 'music']
    }
  ];
  
  const PROGRAMS = [
    { id: 'os', name: 'Operating System', size: 1, color: 'bg-blue-500', removable: false },
    { id: 'browser', name: 'Web Browser', size: 1, color: 'bg-green-500', removable: true, status: 'open' },
    { id: 'word', name: 'Word Processor', size: 2, color: 'bg-yellow-500', removable: true, status: 'open' },
    { id: 'music', name: 'Music Player', size: 1, color: 'bg-purple-500', removable: true, status: 'open' },
    { id: 'video', name: 'Video Editor', size: 3, color: 'bg-pink-500', removable: true, status: 'open' },
    { id: 'game', name: 'Game', size: 4, color: 'bg-red-500', removable: true, status: 'open' },
    { id: 'email', name: 'Email Client', size: 1, color: 'bg-indigo-500', removable: true, status: 'open' }
  ];

  const startSimulation = (levelNum?: number) => {
    const effectiveLevel = levelNum || currentLevel;
    let levelData;
    if (gameMode === 'challenges') {
      levelData = CHALLENGE_LEVELS[effectiveLevel - 1];
      setRamCapacity(levelData.ram);
    }
    
    // Small delay to ensure ramCapacity state updates before we use it
    setTimeout(() => {
      if (gameMode === 'challenges') {
        const level = CHALLENGE_LEVELS[effectiveLevel - 1];
        
        // Get unique programs for storage, but keep the full sequence for the queue
        const uniqueProgramIds = [...new Set(level.programs)];
        const levelPrograms = PROGRAMS.filter(p => uniqueProgramIds.includes(p.id));
        setSecondaryStorage(levelPrograms);
        setProgramQueue(level.programs);
      } else {
        // Freestyle mode
        const availablePrograms = PROGRAMS.filter(p => p.size <= ramCapacity);
        setSecondaryStorage(availablePrograms);
        setProgramQueue(availablePrograms.map(p => p.id));
      }
      
      setRam([]);
      setVirtualMemory([]);
      setGameState('running');
      setScore(0);
      setMessage('');
      setCurrentInstruction('Computer is starting up. The Operating System needs to load into RAM. Drag the OS from Secondary Storage to RAM.');
    }, 0);
  };

  const resetSimulation = () => {
    if (gameMode === 'challenges') {
      setGameState('challenges');
    } else {
      setGameState('start');
    }
    setCurrentInstruction('');
    setProgramQueue([]);
  };

  const handleDragStart = (e: React.DragEvent, item: Program, source: string) => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropToRAM = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || isLoading) return;

    const { item, source } = draggedItem;
    
    // Use the correct RAM capacity
    const currentRAMCapacity = gameMode === 'challenges' ? CHALLENGE_LEVELS[currentLevel - 1].ram : ramCapacity;
    
    // Check if program is too large for this RAM capacity
    if (item.size > currentRAMCapacity) {
      setMessage(`❌ ${item.name} requires ${item.size}GB of RAM, but this computer only has ${currentRAMCapacity}GB! You need a computer with at least ${item.size}GB RAM to run this program.`);
      setDraggedItem(null);
      return;
    }
    
    // Check if RAM has space
    const currentRAMSize = ram.reduce((sum, p) => sum + p.size, 0);
    if (currentRAMSize + item.size > currentRAMCapacity) {
      // Check if freeing up space would even help
      const inactivePrograms = ram.filter(p => p.removable && p.status === 'inactive');
      const inactiveSize = inactivePrograms.reduce((sum, p) => sum + p.size, 0);
      const activeSize = ram.filter(p => !p.removable || p.status === 'open').reduce((sum, p) => sum + p.size, 0);
      
      if (activeSize + item.size > currentRAMCapacity) {
        setMessage(
          <div>
            <p className="mb-2 font-bold">❌ Impossible! This program won't fit even if you free up space.</p>
            <p className="mb-2 text-sm">
              You need {item.size}GB for {item.name}, but with the OS and other active programs, 
              there's only space for programs up to {currentRAMCapacity - activeSize}GB.
            </p>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 mt-2 text-sm font-semibold bg-red-600 rounded hover:bg-red-700"
            >
              Reset Simulation
            </button>
          </div>
        );
      } else if (inactiveSize > 0) {
        setMessage(`❌ RAM is full! You need ${item.size}GB but only ${currentRAMCapacity - currentRAMSize}GB is available. Move inactive programs to Virtual Memory first.`);
      } else {
        setMessage(
          <div>
            <p className="mb-2 font-bold">❌ RAM is full and you have no inactive programs to move!</p>
            <p className="mb-2 text-sm">
              Try making some programs inactive (click them) first, then move them to Virtual Memory. 
              Or close some programs by dragging them to Secondary Storage.
            </p>
          </div>
        );
      }
      setDraggedItem(null);
      return;
    }

    // Check if it's the correct program to open
    if (programQueue.length > 0 && item.id !== programQueue[0]) {
      setMessage(`❌ Wait! You need to open ${PROGRAMS.find(p => p.id === programQueue[0])?.name} next.`);
      setDraggedItem(null);
      return;
    }

    // Move item to RAM with loading delay
    if (source === 'secondary') {
      setIsLoading(true);
      setLoadingMessage(`Loading ${item.name} into RAM...`);
      setMessage('');
      
      setTimeout(() => {
        setRam([...ram, { ...item, status: 'open' }]);
        setScore(score + 10);
        setMessage(`✓ ${item.name} loaded into RAM successfully! (Original remains in storage)`);
        setIsLoading(false);
        setLoadingMessage('');
        
        // Update queue and instruction
        const newQueue = programQueue.slice(1);
        setProgramQueue(newQueue);
        
        if (newQueue.length > 0) {
          const nextProgram = PROGRAMS.find(p => p.id === newQueue[0]);
          if (nextProgram) {
            setCurrentInstruction(`Open ${nextProgram.name} (${nextProgram.size}GB).`);
          }
        } else {
          if (gameMode === 'challenges') {
            setCurrentInstruction('🎉 Level Complete! All programs loaded successfully!');
          } else {
            setCurrentInstruction('All programs opened! Now try making some programs inactive (click them), then move them to Virtual Memory. You can also close active programs by dragging them to Secondary Storage.');
          }
          setGameState('complete');
        }
      }, 2000);
    } else if (source === 'virtual') {
      setIsLoading(true);
      setLoadingMessage(`Swapping ${item.name} back into RAM...`);
      setMessage('');
      
      setTimeout(() => {
        setRam([...ram, { ...item, status: 'open' }]);
        setVirtualMemory(virtualMemory.filter(p => p.id !== item.id));
        setScore(score + 5);
        setMessage(`✓ ${item.name} swapped back into RAM from Virtual Memory!`);
        setIsLoading(false);
        setLoadingMessage('');
        
        // Update queue and instruction for challenges mode
        if (gameMode === 'challenges') {
          const newQueue = programQueue.slice(1);
          setProgramQueue(newQueue);
          
          if (newQueue.length > 0) {
            const nextProgram = PROGRAMS.find(p => p.id === newQueue[0]);
            if (nextProgram) {
              setCurrentInstruction(`Open ${nextProgram.name} (${nextProgram.size}GB).`);
            }
          } else {
            setCurrentInstruction('🎉 Level Complete! All programs loaded successfully!');
            setGameState('complete');
          }
        }
      }, 1000);
    }

    setDraggedItem(null);
  };

  const handleDropToVirtual = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || isLoading) return;

    const { item, source } = draggedItem;

    if (source !== 'ram') {
      setMessage('❌ Only programs in RAM can be moved to Virtual Memory!');
      setDraggedItem(null);
      return;
    }

    if (!item.removable) {
      setMessage('❌ The Operating System cannot be moved to Virtual Memory!');
      setDraggedItem(null);
      return;
    }

    if (item.status === 'open') {
      setMessage('💡 Tip: Click the program to make it inactive (background task) before moving to Virtual Memory.');
      setDraggedItem(null);
      return;
    }

    // Move to virtual memory - instant (no delay)
    setVirtualMemory([...virtualMemory, item]);
    setRam(ram.filter(p => p.id !== item.id));
    setScore(score + 5);
    setMessage(`✓ ${item.name} moved to Virtual Memory to free up RAM!`);
    setDraggedItem(null);
  };

  const handleDropToSecondary = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || isLoading) return;

    const { item, source } = draggedItem;

    if (source === 'ram' && item.status === 'open') {
      // Close program and remove from RAM with 1 second delay
      setIsLoading(true);
      setLoadingMessage(`Closing ${item.name}...`);
      setMessage('');
      
      setTimeout(() => {
        setRam(ram.filter(p => p.id !== item.id));
        setScore(score + 3);
        setMessage(`✓ ${item.name} closed and removed from RAM!`);
        setIsLoading(false);
        setLoadingMessage('');
      }, 1000);
    } else if (source === 'ram' && item.status === 'inactive') {
      setMessage('❌ Inactive programs should be moved to Virtual Memory, not closed!');
    } else if (source === 'virtual') {
      // Close from virtual memory with 1 second delay
      setIsLoading(true);
      setLoadingMessage(`Closing ${item.name}...`);
      setMessage('');
      
      setTimeout(() => {
        setVirtualMemory(virtualMemory.filter(p => p.id !== item.id));
        setScore(score + 3);
        setMessage(`✓ ${item.name} closed and removed from Virtual Memory!`);
        setIsLoading(false);
        setLoadingMessage('');
      }, 1000);
    } else {
      setMessage('Programs can only be moved to Secondary Storage when closing them.');
    }

    setDraggedItem(null);
  };

  const toggleProgramStatus = (programId: string) => {
    setRam(ram.map(p => 
      p.id === programId ? { ...p, status: p.status === 'open' ? 'inactive' : 'open' } : p
    ));
    const program = ram.find(p => p.id === programId);
    if (program) {
      setMessage(`${program.name} is now ${program.status === 'open' ? 'inactive (background)' : 'active'}`);
    }
  };

  const currentRAMCapacity = gameMode === 'challenges' ? CHALLENGE_LEVELS[currentLevel - 1].ram : ramCapacity;
  const ramUsage = ram.reduce((sum, p) => sum + p.size, 0);
  const ramPercentage = (ramUsage / currentRAMCapacity) * 100;

  return (
    <div className="min-h-screen p-8 text-white bg-linear-to-br from-slate-900 to-slate-800">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="flex items-center justify-center gap-3 mb-2 text-4xl font-bold">
            <Monitor className="w-10 h-10" />
            Virtual Memory Simulator
          </h1>
          <p className="text-slate-300">OCR J277 Computer Science - Memory Management</p>
        </div>

        {gameState === 'start' && (
          <div className="p-8 rounded-lg bg-slate-800">
            <h2 className="mb-6 text-2xl font-bold text-center">Choose Your Mode</h2>
            
            <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-2">              
              <button
                onClick={() => {
                  setGameMode('challenges');
                  setGameState('challenges');
                }}
                className="p-6 transition transform rounded-lg bg-linear-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:scale-105"
              >
                <h3 className="mb-2 text-2xl font-bold">🏆 Challenges Mode</h3>
                <p className="text-purple-100">
                  Complete {CHALLENGE_LEVELS.length} levels with specific tasks and memory constraints. 
                  Progress from easy to challenging scenarios!
                </p>
              </button>

              <button
                onClick={() => {
                  setGameMode('freestyle');
                  setGameState('freestyle-setup');
                }}
                className="p-6 transition transform rounded-lg bg-linear-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105"
              >
                <h3 className="mb-2 text-2xl font-bold">🎨 Freestyle Mode</h3>
                <p className="text-blue-100">
                  Choose your RAM size and experiment freely with loading programs, 
                  managing memory, and using virtual memory.
                </p>
              </button>

            </div>
          </div>
        )}

        {gameState === 'freestyle-setup' && (
          <div className="p-8 rounded-lg bg-slate-800">
            <h2 className="mb-4 text-2xl font-bold text-center">Freestyle Mode Setup</h2>
            <p className="mb-6 text-center text-slate-300">
              Choose your computer's RAM size and experiment with memory management!
            </p>
            
            <div className="mb-6">
              <label className="block mb-3 text-lg font-semibold text-center">
                Select Computer RAM Size:
              </label>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setRamCapacity(2)}
                  className={`px-6 py-3 rounded-lg font-semibold transition ${
                    ramCapacity === 2 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  2GB RAM
                </button>
                <button
                  onClick={() => setRamCapacity(4)}
                  className={`px-6 py-3 rounded-lg font-semibold transition ${
                    ramCapacity === 4 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  4GB RAM
                </button>
                <button
                  onClick={() => setRamCapacity(8)}
                  className={`px-6 py-3 rounded-lg font-semibold transition ${
                    ramCapacity === 8 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  8GB RAM
                </button>
              </div>
              <p className="mt-3 text-sm text-center text-slate-400">
                Note: Some programs require more RAM to run!
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setGameState('start')}
                className="px-6 py-3 font-semibold transition rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                ← Back
              </button>
              <button
                onClick={() => startSimulation()}
                className="px-8 py-3 font-semibold transition bg-green-600 rounded-lg hover:bg-green-700"
              >
                Start Computer
              </button>
            </div>
          </div>
        )}

        {gameState === 'challenges' && (
          <div className="p-8 rounded-lg bg-slate-800">
            <h2 className="mb-6 text-2xl font-bold text-center">Challenge Levels</h2>
            
            <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 lg:grid-cols-3">
              {CHALLENGE_LEVELS.map((level) => (
                <button
                  key={level.level}
                  onClick={() => {
                    setCurrentLevel(level.level);
                    startSimulation(level.level);
                  }}
                  className="p-4 text-left transition transform rounded-lg bg-slate-700 hover:bg-slate-600 hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-bold">Level {level.level}</h3>
                    <span className="px-2 py-1 text-sm bg-blue-600 rounded">{level.ram}GB RAM</span>
                  </div>
                  <p className="mb-1 font-semibold text-blue-300">{level.name}</p>
                  <p className="text-sm text-slate-400">{level.description}</p>
                  <p className="mt-2 text-xs text-slate-500">{level.programs.length} programs to load</p>
                </button>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={() => setGameState('start')}
                className="px-6 py-3 font-semibold transition rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
        )}

        {(gameState === 'running' || gameState === 'complete') && (
          <>
            <div className="p-4 mb-6 rounded-lg bg-slate-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-blue-400" />
                  <span className="text-sm tracking-wide uppercase text-slate-400">
                    {gameMode === 'challenges' ? `Level ${currentLevel}: ${CHALLENGE_LEVELS[currentLevel - 1].name}` : 'Freestyle Mode'}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-sm text-slate-400">{currentRAMCapacity}GB RAM</span>
                </div>
                <div className="font-bold text-yellow-400">Score: {score}</div>
              </div>
              <p className="mb-1 text-xl font-bold text-white">{currentInstruction}</p>
              {isLoading && (
                <div className="flex items-center gap-3 p-3 mt-3 bg-blue-900 border-l-4 border-blue-500 rounded">
                  <div className="w-5 h-5 border-b-2 border-white rounded-full animate-spin"></div>
                  <span className="text-blue-200">{loadingMessage}</span>
                </div>
              )}
              {message && !isLoading && (
                <div className="p-3 mt-3 border-l-4 border-blue-500 rounded bg-slate-700">
                  {message}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 mb-6 lg:grid-cols-2">
              {/* RAM */}
              <div 
                className="p-6 border-2 border-green-500 rounded-lg bg-slate-800"
                onDragOver={handleDragOver}
                onDrop={handleDropToRAM}
              >
                <h3 className="flex items-center gap-2 mb-4 text-xl font-bold">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  RAM (Primary Memory)
                </h3>
                <div className="mb-4">
                  <div className="flex justify-between mb-1 text-sm">
                    <span>Usage: {ramUsage} / {currentRAMCapacity} GB</span>
                    <span>{ramPercentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full h-4 overflow-hidden rounded-full bg-slate-700">
                    <div 
                      className={`h-full transition-all ${ramPercentage >= 100 ? 'bg-red-500' : ramPercentage >= 75 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(ramPercentage, 100)}%` }}
                    ></div>
                  </div>
                </div>
                <div className="space-y-2 min-h-50">
                  {ram.map(program => (
                    <div
                      key={program.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, program, 'ram')}
                      onClick={() => program.removable && toggleProgramStatus(program.id)}
                      className={`${program.color} p-3 rounded cursor-move hover:opacity-80 transition`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{program.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-sm bg-black rounded bg-opacity-30">
                            {program.status || 'running'}
                          </span>
                          <span className="text-sm">{program.size} GB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {ram.length === 0 && (
                    <div className="py-8 text-center text-slate-500">
                      Drop programs here to load into RAM
                    </div>
                  )}
                </div>
              </div>

              {/* Secondary Storage */}
              <div className="p-6 border-2 border-purple-500 rounded-lg bg-slate-800">
                <h3 className="flex items-center gap-2 mb-4 text-xl font-bold">
                  <HardDrive className="w-5 h-5" />
                  Secondary Storage (Hard Disk)
                </h3>
                
                {/* Virtual Memory Section */}
                <div 
                  className="p-4 mb-4 border-2 border-orange-500 rounded-lg bg-slate-900"
                  onDragOver={handleDragOver}
                  onDrop={handleDropToVirtual}
                >
                  <h4 className="mb-2 font-semibold text-orange-400">Virtual Memory (for inactive programs)</h4>
                  <div className="space-y-2 min-h-25">
                    {virtualMemory.map(program => (
                      <div
                        key={program.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, program, 'virtual')}
                        className={`${program.color} p-2 rounded cursor-move hover:opacity-80 transition text-sm`}
                      >
                        <div className="flex justify-between">
                          <span>{program.name}</span>
                          <span>{program.size} GB</span>
                        </div>
                      </div>
                    ))}
                    {virtualMemory.length === 0 && (
                      <div className="py-4 text-sm text-center text-slate-600">
                        Drop inactive background programs here when RAM is full
                      </div>
                    )}
                  </div>
                </div>

                {/* Regular Storage */}
                <div 
                  className="space-y-2 min-h-50"
                  onDragOver={handleDragOver}
                  onDrop={handleDropToSecondary}
                >
                  <h4 className="mb-2 font-semibold text-purple-400">Programs</h4>
                  {secondaryStorage.map(program => (
                    <div
                      key={program.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, program, 'secondary')}
                      className={`${program.color} p-3 rounded cursor-move hover:opacity-80 transition opacity-70`}
                    >
                      <div className="flex justify-between">
                        <span className="font-semibold">{program.name}</span>
                        <span className="text-sm">{program.size} GB</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="m-6 text-center">
              <button
                onClick={resetSimulation}
                className="px-6 py-2 mr-3 transition rounded-lg bg-slate-700 hover:bg-slate-600"
              >
                {gameMode === 'challenges' ? '← Back to Levels' : 'Reset Simulation'}
              </button>
              
              {gameState === 'complete' && gameMode === 'challenges' && currentLevel < CHALLENGE_LEVELS.length && (
                <button
                  onClick={() => {
                    const nextLevel = currentLevel + 1;
                    setCurrentLevel(nextLevel);
                    startSimulation(nextLevel);
                  }}
                  className="px-6 py-2 transition bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Next Level →
                </button>
              )}
              
              {gameState === 'complete' && gameMode === 'challenges' && currentLevel === CHALLENGE_LEVELS.length && (
                <div className="inline-block px-6 py-2 font-bold rounded-lg bg-linear-to-r from-yellow-600 to-orange-600">
                  🎉 All Challenges Complete! 🎉
                </div>
              )}
            </div>

            <div className="p-6 rounded-lg bg-slate-800">
              <h3 className="mb-3 font-bold">📚 Key Concepts:</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>• <strong>RAM:</strong> Fast, volatile memory that holds active programs</li>
                <li>• <strong>Virtual Memory:</strong> Uses secondary storage when RAM is full for inactive programs</li>
                <li>• <strong>Active vs Inactive:</strong> Click programs in RAM to toggle between active and inactive (background)</li>
                <li>• <strong>Page Swapping:</strong> Moving inactive programs between RAM and virtual memory to free up space in RAM</li>
                <li>• <strong>Performance:</strong> Swapping to virtual memory is slow, so frequently-used programs should stay in RAM</li>
              </ul>
            </div>
          </>
        )}

      <footer className="py-4 text-center text-slate-400 bg-slate-900">
        Copyright <a href="https://mrluthercodes.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-blue-400 transition hover:text-blue-300">Mr Luther</a> 2025
      </footer>
      
      </div>
      

    </div>
  );
};

export default VirtualMemorySimulator;
