import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

interface Game {
  id: number;
  name: string;
  category: string;
  image: string;
}

interface SelectedGameDetail {
  id: number;
  name: string;
  required_gpu: string;
  gpu_score: number;
}

interface RecommendationResponse {
  recommended_gpu: {
    name: string;
    score: number;
    price: string;
  };
  selected_games_count: number;
  most_demanding_game: {
    name: string;
    required_gpu: string;
  };
  selected_games: SelectedGameDetail[];
}

const MinMaxTab = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<number[]>([]);
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch games on component mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/games/list`);
        if (!response.ok) {
          throw new Error('Failed to fetch games');
        }
        const data = await response.json();
        setGames(data);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Failed to load games. Please try again later.');
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
    // Clear recommendation when selection changes
    setRecommendation(null);
  };

  // Get GPU recommendation
  const getRecommendation = async () => {
    if (selectedGameIds.length === 0) {
      setError('Please select at least one game');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/minmax/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ game_ids: selectedGameIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to get recommendation');
      }

      const data = await response.json();
      setRecommendation(data);
    } catch (err) {
      console.error('Error getting recommendation:', err);
      setError('Failed to get GPU recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter games based on search
  const filteredGames = games.filter(game =>
    game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    game.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-red-600">Min-Max GPU Builder</h1>
          <p className="text-gray-400">
            Select the games you play and we'll recommend the minimum GPU needed to run them all at 1440p 60fps
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-600 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Game Selection */}
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-red-600">
                Select Games ({selectedGameIds.length} selected)
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-2">
                {filteredGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => toggleGameSelection(game.id)}
                    className={`
                      cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200
                      ${selectedGameIds.includes(game.id)
                        ? 'border-red-600 shadow-lg shadow-red-600/50 scale-105'
                        : 'border-gray-700 hover:border-red-600/50'
                      }
                    `}
                  >
                    <div className="relative">
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-32 object-cover"
                      />
                      {selectedGameIds.includes(game.id) && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-gray-800">
                      <h3 className="font-semibold text-sm truncate">{game.name}</h3>
                      <p className="text-xs text-gray-400">{game.category}</p>
                    </div>
                  </div>
                ))}
              </div>

              {filteredGames.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  No games found matching your search.
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                onClick={getRecommendation}
                disabled={selectedGameIds.length === 0 || loading}
                className={`
                  w-full py-4 rounded-lg font-bold text-lg transition-all duration-200
                  ${selectedGameIds.length === 0 || loading
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/50'
                  }
                `}
              >
                {loading ? 'Analyzing...' : 'Get GPU Recommendation'}
              </button>
            </div>
          </div>

          {/* Right Column: Recommendation */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 sticky top-6">
              <h2 className="text-2xl font-bold mb-4 text-red-600">Recommendation</h2>

              {!recommendation && (
                <div className="text-center py-12 text-gray-500">
                  <svg
                    className="mx-auto h-16 w-16 mb-4 text-gray-700"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                    />
                  </svg>
                  <p>Select games and click "Get GPU Recommendation" to see results</p>
                </div>
              )}

              {recommendation && (
                <div className="space-y-6">
                  {/* Recommended GPU Card */}
                  <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-lg p-6 shadow-xl">
                    <div className="text-sm text-red-200 mb-2">Recommended GPU</div>
                    <div className="text-3xl font-bold mb-2">{recommendation.recommended_gpu.name}</div>
                    <div className="text-2xl font-semibold text-red-100">{recommendation.recommended_gpu.price}</div>
                    <div className="mt-4 text-sm text-red-200">
                      Performance Score: {recommendation.recommended_gpu.score}
                    </div>
                  </div>

                  {/* Most Demanding Game */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Most Demanding Game</div>
                    <div className="text-lg font-semibold">{recommendation.most_demanding_game.name}</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Requires: {recommendation.most_demanding_game.required_gpu}
                    </div>
                  </div>

                  {/* Selected Games Summary */}
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-3">
                      Selected Games ({recommendation.selected_games_count})
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {recommendation.selected_games.map((game) => (
                        <div
                          key={game.id}
                          className="flex justify-between items-center text-sm py-2 border-b border-gray-700 last:border-0"
                        >
                          <span className="truncate flex-1">{game.name}</span>
                          <span className="text-gray-400 text-xs ml-2">{game.required_gpu}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
                    <div className="text-xs text-blue-300">
                      <strong>Note:</strong> This recommendation is based on Steam recommended requirements
                      for 1440p 60fps gaming. Actual performance may vary based on game settings and system configuration.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinMaxTab;
