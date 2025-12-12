import { useState } from 'react';
import { API_BASE_URL } from '../config';

const IntegrationTest = () => {
  const [steamQuery, setSteamQuery] = useState('');
  const [ebayQuery, setEbayQuery] = useState('');
  const [steamResults, setSteamResults] = useState<any[]>([]);
  const [ebayResults, setEbayResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const searchSteam = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/steam/search?query=${steamQuery}`);
      const data = await res.json();
      setSteamResults(data);
    } catch (error) {
      console.error("Error searching Steam:", error);
    }
    setLoading(false);
  };

  const searchEbay = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ebay/search?query=${ebayQuery}`);
      const data = await res.json();
      setEbayResults(data.itemSummaries || []);
    } catch (error) {
      console.error("Error searching eBay:", error);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">API Integration Test</h1>
      
      <div className="grid grid-cols-2 gap-8">
        {/* Steam Section */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-blue-400">Steam Integration</h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={steamQuery}
              onChange={(e) => setSteamQuery(e.target.value)}
              placeholder="Search Steam games..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
            <button 
              onClick={searchSteam}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-bold"
              disabled={loading}
            >
              Search
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {steamResults.map((game: any) => (
              <div key={game.id} className="bg-gray-800 p-3 rounded flex gap-3">
                {game.tiny_image && <img src={game.tiny_image} alt={game.name} className="w-16 h-16 object-cover" />}
                <div>
                  <div className="font-bold">{game.name}</div>
                  <div className="text-gray-400">{game.price ? `${game.price.currency} ${game.price.final / 100}` : 'Free'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* eBay Section */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4 text-yellow-400">eBay Integration</h2>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              value={ebayQuery}
              onChange={(e) => setEbayQuery(e.target.value)}
              placeholder="Search eBay products..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            />
            <button 
              onClick={searchEbay}
              className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded font-bold"
              disabled={loading}
            >
              Search
            </button>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {ebayResults.map((item: any) => (
              <div key={item.itemId} className="bg-gray-800 p-3 rounded flex gap-3">
                {item.image && <img src={item.image.imageUrl} alt={item.title} className="w-16 h-16 object-cover" />}
                <div>
                  <div className="font-bold line-clamp-2">{item.title}</div>
                  <div className="text-gray-400">
                    {item.price && `${item.price.currency} ${item.price.value}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;
