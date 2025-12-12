import { useState, useEffect } from 'react';
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
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'selection' | 'result'>('selection');
  const [activeIndex, setActiveIndex] = useState(0);
  const [setupMode, setSetupMode] = useState<SetupMode>('recommended');

  // Fetch games on component mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/minmax/games`);
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        console.error('Error fetching games:', err);
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Unable to connect to the server. Please check your internet connection and try again.');
        } else {
          setError('Failed to load games. Please refresh the page or try again later.');
        }
      }
    };

    fetchGames();
  }, []);

  // Handle game selection toggle
  const toggleGameSelection = (gameId: number) => {
    setSelectedGameIds(prev => {
      if (prev.includes(gameId)) {
        return prev.filter(id => id !== gameId);
      } else {
        return [...prev, gameId];
      }
    });
  };

  // Get Recommendation
  const getRecommendation = async (idsOverride?: number[]) => {
    const idsToUse = idsOverride || selectedGameIds;

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
    const newIds = selectedGameIds.filter(id => id !== gameId);
    setSelectedGameIds(newIds);

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

  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedGamesList = games.filter(game => selectedGameIds.includes(game.id));

  if (view === 'selection') {
    return (
      <div className="minmax-container" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '2rem', textAlign: 'center' }}>Build Your Perfect Setup</h2>

        {error && (
          <div style={{ backgroundColor: '#ff4444', color: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Left Column: Game Selection */}
          <div>
            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
              <input
                type="text"
                placeholder="Search games..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  fontSize: '1.1rem',
                  backgroundColor: '#2a2a2a',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  color: 'white'
                }}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '1rem',
              maxHeight: '600px',
              overflowY: 'auto',
              paddingRight: '0.5rem'
            }}>
              {filteredGames.map(game => (
                <div
                  key={game.id}
                  onClick={() => toggleGameSelection(game.id)}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/4',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    border: selectedGameIds.includes(game.id) ? '3px solid #00ff88' : '3px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  <img
                    src={game.image}
                    alt={game.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '0.5rem',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                    textAlign: 'center'
                  }}>
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{game.name}</span>
                  </div>
                  {selectedGameIds.includes(game.id) && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      backgroundColor: '#00ff88',
                      borderRadius: '50%',
                      padding: '0.25rem',
                      display: 'flex'
                    }}>
                      <FaCheck color="black" size={12} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Selected Games List */}
          <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', height: 'fit-content' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.5rem' }}>
              Selected Games ({selectedGameIds.length})
            </h3>

            {selectedGamesList.length === 0 ? (
              <p style={{ color: '#888', fontStyle: 'italic' }}>No games selected yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '500px', overflowY: 'auto' }}>
                {selectedGamesList.map(game => (
                  <div key={game.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#2a2a2a',
                    padding: '0.75rem',
                    borderRadius: '6px'
                  }}>
                    <span>{game.name}</span>
                    <button
                      onClick={() => toggleGameSelection(game.id)}
                      style={{ background: 'none', border: 'none', color: '#ff4444', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                    >
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => getRecommendation()}
              disabled={loading || selectedGameIds.length === 0}
              style={{
                width: '100%',
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: selectedGameIds.length > 0 ? '#00ff88' : '#444',
                color: selectedGameIds.length > 0 ? 'black' : '#888',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: selectedGameIds.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Analyzing...' : 'Get Optimal Setup'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Result View (restored original styling)
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

    const LEFT_COL_WIDTH = 320;
    const GAP = 150;
    const RIGHT_COL_START = LEFT_COL_WIDTH + GAP;
    const CONTAINER_HEIGHT = 700;
    const CENTER_Y = CONTAINER_HEIGHT / 2;
    const CARD_HEIGHT = 130;
    const VERTICAL_GAP = (CONTAINER_HEIGHT - (CARD_HEIGHT * 3)) / 2;
    const CARD_1_Y = (CARD_HEIGHT / 2);
    const CARD_2_Y = CARD_HEIGHT + VERTICAL_GAP + (CARD_HEIGHT / 2);
    const CARD_3_Y = (CARD_HEIGHT * 2) + (VERTICAL_GAP * 2) + (CARD_HEIGHT / 2);

    const activeBuild = setupMode === 'minimal' ? recommendation.min_build : recommendation.max_build;

    return (
      <div className="minmax-result" style={{
        padding: '2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
          <button
            onClick={() => setView('selection')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'none',
              border: 'none',
              color: '#00ff88',
              cursor: 'pointer',
              fontSize: '1.1rem',
            }}
          >
            <FaArrowLeft /> Back to Selection
          </button>

          <button
            onClick={() => setSetupMode(prev => (prev === 'minimal' ? 'recommended' : 'minimal'))}
            style={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              color: 'white',
              padding: '0.75rem 1rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Showing: {setupMode === 'minimal' ? 'Minimum' : 'Recommended'} (click to switch)
          </button>
        </div>

        <div style={{
          display: 'flex',
          gap: `${GAP}px`,
          alignItems: 'center',
          position: 'relative',
          minHeight: `${CONTAINER_HEIGHT}px`
        }}>
          {/* SVG Lines Layer */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
            <defs>
              <linearGradient id="grad1" gradientUnits="userSpaceOnUse" x1={LEFT_COL_WIDTH} y1="0" x2={RIGHT_COL_START} y2="0">
                <stop offset="0%" style={{ stopColor: '#00ff88', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="grad2" gradientUnits="userSpaceOnUse" x1={LEFT_COL_WIDTH} y1="0" x2={RIGHT_COL_START} y2="0">
                <stop offset="0%" style={{ stopColor: '#00ccff', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              </linearGradient>
              <linearGradient id="grad3" gradientUnits="userSpaceOnUse" x1={LEFT_COL_WIDTH} y1="0" x2={RIGHT_COL_START} y2="0">
                <stop offset="0%" style={{ stopColor: '#ff0088', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#ffffff', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <path
              d={`M ${LEFT_COL_WIDTH} ${CARD_1_Y} C ${LEFT_COL_WIDTH + GAP / 2} ${CARD_1_Y}, ${LEFT_COL_WIDTH + GAP / 2} ${CENTER_Y}, ${RIGHT_COL_START} ${CENTER_Y}`}
              fill="none" stroke="url(#grad1)" strokeWidth="3" strokeDasharray="8,8"
            />
            <path
              d={`M ${LEFT_COL_WIDTH} ${CARD_2_Y} C ${LEFT_COL_WIDTH + GAP / 2} ${CARD_2_Y}, ${LEFT_COL_WIDTH + GAP / 2} ${CENTER_Y}, ${RIGHT_COL_START} ${CENTER_Y}`}
              fill="none" stroke="url(#grad2)" strokeWidth="3" strokeDasharray="8,8"
            />
            <path
              d={`M ${LEFT_COL_WIDTH} ${CARD_3_Y} C ${LEFT_COL_WIDTH + GAP / 2} ${CARD_3_Y}, ${LEFT_COL_WIDTH + GAP / 2} ${CENTER_Y}, ${RIGHT_COL_START} ${CENTER_Y}`}
              fill="none" stroke="url(#grad3)" strokeWidth="3" strokeDasharray="8,8"
            />
            <circle cx={LEFT_COL_WIDTH} cy={CARD_1_Y} r="6" fill="#00ff88" />
            <circle cx={LEFT_COL_WIDTH} cy={CARD_2_Y} r="6" fill="#00ccff" />
            <circle cx={LEFT_COL_WIDTH} cy={CARD_3_Y} r="6" fill="#ff0088" />
          </svg>

          {/* Left Column: Specs */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: `${CONTAINER_HEIGHT}px`,
            width: `${LEFT_COL_WIDTH}px`,
            zIndex: 2
          }}>
            <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', borderLeft: '5px solid #00ff88', height: `${CARD_HEIGHT}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <FaDesktop size={24} color="#00ff88" />
                <h3 style={{ margin: 0 }}>Graphics Card</h3>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{activeBuild.gpu_name}</div>
              <div style={{ color: '#888' }}>Score: {activeBuild.gpu_score} • Tier: {activeBuild.tier}</div>
            </div>

            <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', borderLeft: '5px solid #00ccff', height: `${CARD_HEIGHT}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <FaMicrochip size={24} color="#00ccff" />
                <h3 style={{ margin: 0 }}>Processor</h3>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{activeBuild.cpu_name}</div>
              <div style={{ color: '#888' }}>Score: {activeBuild.cpu_score}</div>
            </div>

            <div style={{ backgroundColor: '#1a1a1a', padding: '1.5rem', borderRadius: '12px', borderLeft: '5px solid #ff0088', height: `${CARD_HEIGHT}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <FaMemory size={24} color="#ff0088" />
                <h3 style={{ margin: 0 }}>Memory</h3>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                {activeBuild.ram_gb ? `${activeBuild.ram_gb} GB` : 'Unknown'}
              </div>
              <div style={{ color: '#888' }}>{activeBuild.description}</div>
            </div>
          </div>

          {/* Right Column: Visual Representation */}
          <div style={{
            flex: 1,
            backgroundColor: '#2a2a2a',
            borderRadius: '20px',
            height: `${CONTAINER_HEIGHT}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', left: '0', top: '50%', width: '12px', height: '12px', backgroundColor: 'white', borderRadius: '50%', transform: 'translate(-50%, -50%)', zIndex: 10 }}></div>

            <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {sortedGames.map((game, index) => {
                const offset = index - activeIndex;
                const isActive = index === activeIndex;

                const xOffset = offset * 220;
                const scale = isActive ? 1 : Math.max(0.7, 1 - Math.abs(offset) * 0.15);
                const zIndex = 100 - Math.abs(offset);
                const opacity = Math.abs(offset) > 2 ? 0 : 1 - Math.abs(offset) * 0.2;

                return (
                  <div
                    key={game.id}
                    onClick={() => setActiveIndex(index)}
                    style={{
                      position: 'absolute',
                      width: '280px',
                      height: '420px',
                      borderRadius: '16px',
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.95) 90%), url(${game.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: isActive ? '0 20px 50px rgba(0,0,0,0.7)' : '0 10px 30px rgba(0,0,0,0.5)',
                      transform: `translateX(${xOffset}px) scale(${scale})`,
                      zIndex: zIndex,
                      opacity: opacity,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-end',
                      padding: '1.5rem',
                      border: isActive ? '2px solid #00ff88' : '1px solid #444',
                      transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                      cursor: 'pointer'
                    }}
                  >
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>{game.name}</h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaDesktop size={14} color="#00ff88" />
                        <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{game.required_gpu}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaMicrochip size={14} color="#00ccff" />
                        <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{game.required_cpu}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaMemory size={14} color="#ff0088" />
                        <span style={{ color: '#ddd', fontSize: '0.9rem' }}>{game.required_memory}</span>
                      </div>

                      {isActive && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteGame(game.id); }}
                          style={{
                            marginTop: '1rem',
                            background: 'rgba(255, 68, 68, 0.2)',
                            color: '#ff4444',
                            border: '1px solid #ff4444',
                            borderRadius: '6px',
                            padding: '0.5rem',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            transition: 'background 0.2s'
                          }}
                          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.4)'}
                          onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 68, 68, 0.2)'}
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
