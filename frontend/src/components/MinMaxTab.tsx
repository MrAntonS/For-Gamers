import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config';
import { FaMicrochip, FaMemory, FaDesktop, FaSearch, FaTimes, FaArrowLeft, FaCheck } from 'react-icons/fa';

interface Game {
  id: number;
  name: string;
  category: string;
  image: string;
  recommended_gpu?: string;
  gpu_score?: number;
  recommended_cpu?: string;
  cpu_score?: number;
  recommended_memory?: string;
  memory_score?: number;
}

interface BuildRecommendation {
  gpu_score: number;
  gpu_name: string;
  cpu_score: number;
  cpu_name: string;
  ram_gb: number;
  tier: string;
  description: string;
}

interface RecommendationResponse {
  min_build: BuildRecommendation;
  max_build: BuildRecommendation;
  details: GameDetail[];
}

interface GameRequirementDetail {
  gpu_score: number;
  gpu_name: string;
  cpu_score: number;
  cpu_name: string;
  ram_gb: number;
}

interface GameDetail {
  id: number;
  name: string;
  image: string;
  minimum: GameRequirementDetail;
  recommended: GameRequirementDetail;
}

type SetupMode = 'minimal' | 'recommended';

const MinMaxTab = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGames, setSelectedGames] = useState<Game[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [hasMoreGames, setHasMoreGames] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'selection' | 'result'>('selection');
  const [activeIndex, setActiveIndex] = useState(0);
  const [setupMode, setSetupMode] = useState<SetupMode>('recommended');
  const gamesContainerRef = useRef<HTMLDivElement>(null);
  const GAMES_PER_PAGE = 60;

  // Derived: set of selected game IDs for quick lookup
  const selectedGameIds = new Set(selectedGames.map(g => g.id));

  // Fetch games with pagination
  const fetchGames = useCallback(async (offset: number = 0, search: string = '') => {
    if (gamesLoading) return;
    setGamesLoading(true);

    try {
      const params = new URLSearchParams({
        limit: GAMES_PER_PAGE.toString(),
        offset: offset.toString(),
      });
      if (search) params.append('q', search);

      const response = await fetch(`${API_BASE_URL}/api/minmax/games?${params}`);
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();

      if (offset === 0) {
        setGames(data);
      } else {
        // Deduplicate when appending
        setGames(prev => {
          const existingIds = new Set(prev.map(g => g.id));
          const newGames = data.filter((g: Game) => !existingIds.has(g.id));
          return [...prev, ...newGames];
        });
      }

      setHasMoreGames(data.length === GAMES_PER_PAGE);
    } catch (err) {
      console.error('Error fetching games:', err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError('Unable to connect to the server. Please check your internet connection and try again.');
      } else {
        setError('Failed to load games. Please refresh the page or try again later.');
      }
    } finally {
      setGamesLoading(false);
    }
  }, [gamesLoading]);

  // Initial fetch
  useEffect(() => {
    fetchGames(0, '');
  }, []);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMoreGames(true);
      fetchGames(0, searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    const container = gamesContainerRef.current;
    if (!container || gamesLoading || !hasMoreGames) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      fetchGames(games.length, searchTerm);
    }
  }, [gamesLoading, hasMoreGames, games.length, searchTerm, fetchGames]);

  // Handle game selection toggle
  const toggleGameSelection = (game: Game) => {
    setSelectedGames(prev => {
      if (prev.some(g => g.id === game.id)) {
        return prev.filter(g => g.id !== game.id);
      } else {
        return [...prev, game];
      }
    });
  };

  // Get Recommendation
  const getRecommendation = async (idsOverride?: number[]) => {
    const idsToUse = idsOverride || Array.from(selectedGameIds);

    if (idsToUse.length === 0) {
      setError('Please select at least one game');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/minmax/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameIds: idsToUse }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Server error (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setRecommendation(data);
      setView('result');
      if (!idsOverride) setActiveIndex(0);
    } catch (err) {
      console.error('Error getting recommendation:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: number) => {
    setSelectedGames(prev => prev.filter(g => g.id !== gameId));
    const newIds = Array.from(selectedGameIds).filter(id => id !== gameId);

    if (newIds.length === 0) {
      setView('selection');
      setRecommendation(null);
      return;
    }

    await getRecommendation(newIds);

    if (activeIndex >= newIds.length) {
      setActiveIndex(Math.max(0, newIds.length - 1));
    }
  };

  if (view === 'selection') {
    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        <h2 className="text-3xl md:text-4xl mb-6 text-center font-bold">Build Your Perfect Setup</h2>

        {error && (
          <div className="bg-red-600 text-white p-4 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-8">
          {/* Left Column: Game Selection */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="mb-6 relative shrink-0">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-lg bg-[#2a2a2a] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-400 transition-colors"
              />
            </div>

            <div
              ref={gamesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto pr-2 flex flex-wrap gap-4 content-start pb-4"
            >
              {games.map(game => (
                <div
                  key={game.id}
                  onClick={() => toggleGameSelection(game)}
                  className={`relative w-[120px] h-[160px] rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2 shadow-lg hover:shadow-xl hover:scale-[1.02] ${selectedGameIds.has(game.id) ? 'border-[#00ff88]' : 'border-transparent'
                    }`}
                >
                  <img
                    src={game.image}
                    alt={game.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 to-transparent text-center">
                    <span className="text-sm font-bold text-white drop-shadow-md">{game.name}</span>
                  </div>
                  {selectedGameIds.has(game.id) && (
                    <div className="absolute top-2 right-2 bg-[#00ff88] rounded-full p-1 shadow-md">
                      <FaCheck className="text-black text-xs" />
                    </div>
                  )}
                </div>
              ))}
              {gamesLoading && (
                <div className="w-full flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff88]"></div>
                </div>
              )}
              {!gamesLoading && games.length === 0 && (
                <div className="w-full text-center text-gray-500 py-8">
                  No games found
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Selected Games List */}
          <div className="bg-[#1a1a1a] p-6 rounded-xl flex flex-col w-full lg:w-[350px] shrink-0 max-h-[300px] lg:max-h-none lg:h-auto">
            <h3 className="text-xl font-bold mb-4 pb-2 border-b border-gray-700 shrink-0">
              Selected Games ({selectedGames.length})
            </h3>

            {selectedGames.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500 italic">
                No games selected yet.
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {selectedGames.map(game => (
                  <div key={game.id} className="flex items-center justify-between bg-[#2a2a2a] p-3 rounded-lg group">
                    <span className="font-medium">{game.name}</span>
                    <button
                      onClick={() => toggleGameSelection(game)}
                      className="text-red-500 hover:text-red-400 p-1 rounded transition-colors"
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => getRecommendation()}
              disabled={loading || selectedGames.length === 0}
              className={`w-full mt-6 p-4 rounded-lg text-lg font-bold transition-all shrink-0 ${selectedGames.length > 0
                  ? 'bg-[#00ff88] text-black hover:bg-[#00cc6a]'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                }`}
            >
              {loading ? 'Analyzing...' : 'Get Optimal Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result View
  if (view === 'result' && recommendation) {
    const sortedGames = [...recommendation.details]
      .map(d => {
        const req = setupMode === 'minimal' ? d.minimum : d.recommended;
        return {
          id: d.id,
          name: d.name,
          image: d.image,
          required_gpu: req.gpu_name || 'Unknown GPU',
          gpu_score: req.gpu_score || 0,
          required_cpu: req.cpu_name || 'Unknown CPU',
          cpu_score: req.cpu_score || 0,
          required_memory: req.ram_gb ? `${req.ram_gb} GB RAM` : 'Unknown RAM',
          memory_score: req.ram_gb || 0,
        };
      })
      .sort((a, b) => b.gpu_score - a.gpu_score);

    const activeBuild = setupMode === 'minimal' ? recommendation.min_build : recommendation.max_build;

    return (
      <div className="h-full flex flex-col p-4 md:p-8 max-w-[1400px] mx-auto w-full">
        <div className="flex items-center justify-between mb-6 shrink-0">
          <button
            onClick={() => setView('selection')}
            className="flex items-center gap-2 text-[#00ff88] hover:text-[#00cc6a] transition-colors text-lg font-medium"
          >
            <FaArrowLeft /> Back to Selection
          </button>

          <button
            onClick={() => setSetupMode(prev => (prev === 'minimal' ? 'recommended' : 'minimal'))}
            className="bg-[#2a2a2a] border border-gray-700 rounded-lg text-white px-4 py-2 hover:bg-[#333] transition-colors"
          >
            Showing: {setupMode === 'minimal' ? 'Minimum' : 'Recommended'} (click to switch)
          </button>
        </div>

        <div className="flex-1 min-h-0 flex items-stretch">
          {/* Left Column: Specs */}
          <div className="w-[300px] md:w-[320px] flex flex-col justify-between z-20 shrink-0">
            <div className="flex-1 flex items-center py-2">
              <div className="w-full bg-[#1a1a1a] p-6 rounded-xl border-l-[5px] border-[#00ff88] shadow-lg">
                <div className="flex items-center gap-4 mb-2">
                  <FaDesktop size={24} className="text-[#00ff88]" />
                  <h3 className="m-0 font-bold">Graphics Card</h3>
                </div>
                <div className="text-xl md:text-2xl font-bold mb-1 truncate" title={activeBuild.gpu_name}>{activeBuild.gpu_name}</div>
                <div className="text-gray-400 text-sm">Score: {activeBuild.gpu_score} • Tier: {activeBuild.tier}</div>
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(activeBuild.gpu_name)}`)}
                  className="mt-4 w-full bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#00ff88]/20 transition-all group"
                >
                  <FaSearch size={12} className="group-hover:scale-110 transition-transform" /> Search similar
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center py-2">
              <div className="w-full bg-[#1a1a1a] p-6 rounded-xl border-l-[5px] border-[#00ccff] shadow-lg">
                <div className="flex items-center gap-4 mb-2">
                  <FaMicrochip size={24} className="text-[#00ccff]" />
                  <h3 className="m-0 font-bold">Processor</h3>
                </div>
                <div className="text-xl md:text-2xl font-bold mb-1 truncate" title={activeBuild.cpu_name}>{activeBuild.cpu_name}</div>
                <div className="text-gray-400 text-sm">Score: {activeBuild.cpu_score}</div>
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(activeBuild.cpu_name)}`)}
                  className="mt-4 w-full bg-[#00ccff]/10 text-[#00ccff] border border-[#00ccff]/30 rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#00ccff]/20 transition-all group"
                >
                  <FaSearch size={12} className="group-hover:scale-110 transition-transform" /> Search similar
                </button>
              </div>
            </div>

            <div className="flex-1 flex items-center py-2">
              <div className="w-full bg-[#1a1a1a] p-6 rounded-xl border-l-[5px] border-[#ff0088] shadow-lg">
                <div className="flex items-center gap-4 mb-2">
                  <FaMemory size={24} className="text-[#ff0088]" />
                  <h3 className="m-0 font-bold">Memory</h3>
                </div>
                <div className="text-xl md:text-2xl font-bold mb-1">
                  {activeBuild.ram_gb ? `${activeBuild.ram_gb} GB` : 'Unknown'}
                </div>
                <div className="text-gray-400 text-sm">{activeBuild.description}</div>
                <button
                  onClick={() => navigate(`/search?q=${encodeURIComponent(activeBuild.ram_gb + 'GB RAM')}`)}
                  className="mt-4 w-full bg-[#ff0088]/10 text-[#ff0088] border border-[#ff0088]/30 rounded-lg py-2 text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#ff0088]/20 transition-all group"
                >
                  <FaSearch size={12} className="group-hover:scale-110 transition-transform" /> Search similar
                </button>
              </div>
            </div>
          </div>

          {/* Middle Gap with SVG Lines */}
          <div className="w-[50px] md:w-[150px] relative z-10 shrink-0 hidden md:block">
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="grad1" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
                  <stop offset="0%" stopColor="#00ff88" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="grad2" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
                  <stop offset="0%" stopColor="#00ccff" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
                <linearGradient id="grad3" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="0">
                  <stop offset="0%" stopColor="#ff0088" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              {/* Paths connecting 16.6%, 50%, 83.3% on left to 50% on right */}
              <path
                d="M 0 16.66 C 50 16.66, 50 50, 100 50"
                fill="none" stroke="url(#grad1)" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 0 50 C 50 50, 50 50, 100 50"
                fill="none" stroke="url(#grad2)" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 0 83.33 C 50 83.33, 50 50, 100 50"
                fill="none" stroke="url(#grad3)" strokeWidth="0.5" strokeDasharray="2,2" vectorEffect="non-scaling-stroke"
              />
              <circle cx="0" cy="16.66" r="1" fill="#00ff88" vectorEffect="non-scaling-stroke" />
              <circle cx="0" cy="50" r="1" fill="#00ccff" vectorEffect="non-scaling-stroke" />
              <circle cx="0" cy="83.33" r="1" fill="#ff0088" vectorEffect="non-scaling-stroke" />
            </svg>
          </div>

          {/* Right Column: Visual Representation */}
          <div className="flex-1 bg-[#2a2a2a] rounded-[20px] relative z-20 flex flex-col min-h-0 overflow-hidden">
            <div className="absolute left-0 top-1/2 w-3 h-3 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 z-30 hidden md:block"></div>

            <div className="flex-1 overflow-x-auto flex items-center px-8 gap-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              {sortedGames.map((game, index) => {
                const isActive = index === activeIndex;

                return (
                  <div
                    key={game.id}
                    onClick={() => setActiveIndex(index)}
                    className={`relative shrink-0 w-[260px] h-[380px] md:w-[280px] md:h-[420px] rounded-2xl bg-cover bg-center transition-all duration-300 ease-out cursor-pointer flex flex-col justify-end p-6 border snap-center ${isActive ? 'border-[#00ff88] shadow-[0_20px_50px_rgba(0,0,0,0.7)] scale-100 opacity-100' : 'border-[#444] shadow-[0_10px_30px_rgba(0,0,0,0.5)] scale-95 opacity-60 hover:opacity-100'
                      }`}
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.95) 90%), url(${game.image})`,
                    }}
                  >
                    <h3 className="text-2xl font-bold mb-4 drop-shadow-md">{game.name}</h3>

                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <FaDesktop size={14} className="text-[#00ff88]" />
                        <span className="text-gray-200 text-sm">{game.required_gpu}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaMicrochip size={14} className="text-[#00ccff]" />
                        <span className="text-gray-200 text-sm">{game.required_cpu}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FaMemory size={14} className="text-[#ff0088]" />
                        <span className="text-gray-200 text-sm">{game.required_memory}</span>
                      </div>

                      {isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                          className="mt-4 bg-red-500/20 text-red-500 border border-red-500 rounded-md p-2 text-sm flex items-center justify-center gap-2 hover:bg-red-500/40 transition-colors"
                        >
                          <FaTimes size={12} /> Remove Game
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MinMaxTab;
