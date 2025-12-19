import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import { API_BASE_URL } from '../config';

interface GameDeal {
  id: number;
  steam_id?: number;
  title: string;
  price: string;
  originalPrice?: string;
  category: string;
  image: string;
  rating: number;
  description?: string;
  dealLastVerified?: string;
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  genres: string[];
  platforms: string[];
  releaseYears: string[];
  rating: number;
  sort: string;
}

interface FilterOptions {
  genres: string[];
  platforms: string[];
  brands: string[];
  categories: string[];
  price_min: number;
  price_max: number;
}

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="text-red-500 font-bold uppercase tracking-wider mb-3 text-sm">{title}</h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const CheckboxFilter = ({ label, checked, onChange }: { label: string, checked: boolean, onChange: (checked: boolean) => void }) => (
  <label className="flex items-center space-x-3 cursor-pointer group">
    <div className="relative flex items-center">
      <input
        type="checkbox"
        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span className="text-gray-400 group-hover:text-white transition-colors text-sm">{label}</span>
  </label>
);

const GameDeals = () => {
  const [games, setGames] = useState<GameDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    genres: [],
    platforms: [],
    brands: [],
    categories: [],
    price_min: 0,
    price_max: 2000
  });

  // Dynamic price range from filtered results
  const [priceRange, setPriceRange] = useState({ min: 0, max: 2000 });

  // Manual price input modal state
  const [showPriceModal, setShowPriceModal] = useState<'min' | 'max' | null>(null);
  const [tempPriceInput, setTempPriceInput] = useState('');

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 2000,
    genres: [],
    platforms: [],
    releaseYears: [],
    rating: 0,
    sort: 'featured'
  });

  // Applied filters state
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  // Check if filters have changed
  const hasFilterChanges = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/filters`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
          // Optionally adjust local max price if needed, but keeping default is safer for now
        }
      } catch (err) {
        console.error("Failed to fetch filters", err);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchGames = async () => {
      setLoading(true);
      try {
        // Fetch with price filters for products
        const queryParams = new URLSearchParams({
          category: 'Game',
          page: currentPage.toString(),
          limit: '10',
          min_price: appliedFilters.minPrice.toString(),
          max_price: appliedFilters.maxPrice.toString(),
          rating: appliedFilters.rating.toString(),
          sort: appliedFilters.sort,
          genres: appliedFilters.genres.join(','),
          platforms: appliedFilters.platforms.join(','),
          release_years: appliedFilters.releaseYears.join(',')
        });

        const response = await fetch(`${API_BASE_URL}/api/products?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch game deals');
        }
        const data = await response.json();
        const mappedGames = data.products.map((p: any) => ({
          id: p.id,
          steam_id: p.steam_id,
          title: p.title || p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          category: p.category,
          image: p.image,
          rating: p.rating,
          description: p.description,
          dealLastVerified: p.dealLastVerified
        }));
        setGames(mappedGames);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [currentPage, appliedFilters]);

  // Separate effect to fetch price range (without price filters)
  useEffect(() => {
    const fetchPriceRange = async () => {
      try {
        // Fetch WITHOUT price filters to get the full range
        const queryParams = new URLSearchParams({
          category: 'Game',
          page: '1',
          limit: '1',
          min_price: '0',
          max_price: '999999',
          rating: appliedFilters.rating.toString(),
          sort: appliedFilters.sort,
          genres: appliedFilters.genres.join(','),
          platforms: appliedFilters.platforms.join(','),
          release_years: appliedFilters.releaseYears.join(',')
        });

        const response = await fetch(`${API_BASE_URL}/api/products?${queryParams.toString()}`);
        if (response.ok) {
          const data = await response.json();
          if (data.price_min !== undefined && data.price_max !== undefined) {
            setPriceRange({ min: data.price_min, max: data.price_max });

            // On first load, also update the filter values to match the range
            setFilters(prev => ({
              ...prev,
              minPrice: data.price_min,
              maxPrice: data.price_max
            }));
            setAppliedFilters(prev => ({
              ...prev,
              minPrice: data.price_min,
              maxPrice: data.price_max
            }));
          }
        }
      } catch (err) {
        console.error('Failed to fetch price range:', err);
      }
    };

    fetchPriceRange();
  }, [
    appliedFilters.genres,
    appliedFilters.platforms,
    appliedFilters.releaseYears,
    appliedFilters.rating,
    appliedFilters.sort
  ]); // Only update when non-price filters change

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1);
  };

  const handlePriceModalOpen = (type: 'min' | 'max') => {
    setShowPriceModal(type);
    setTempPriceInput(type === 'min' ? filters.minPrice.toString() : filters.maxPrice.toString());
  };

  const handlePriceModalSubmit = () => {
    const value = parseFloat(tempPriceInput);
    if (!isNaN(value) && value >= 0) {
      if (showPriceModal === 'min') {
        setFilters(prev => ({ ...prev, minPrice: Math.min(value, prev.maxPrice) }));
      } else if (showPriceModal === 'max') {
        setFilters(prev => ({ ...prev, maxPrice: Math.max(value, prev.minPrice) }));
      }
    }
    setShowPriceModal(null);
  };

  const handleGenreChange = (genre: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      genres: checked
        ? [...prev.genres, genre]
        : prev.genres.filter(g => g !== genre)
    }));
  };

  const handlePlatformChange = (platform: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      platforms: checked
        ? [...prev.platforms, platform]
        : prev.platforms.filter(p => p !== platform)
    }));
  };

  const handleYearChange = (year: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      releaseYears: checked
        ? [...prev.releaseYears, year]
        : prev.releaseYears.filter(y => y !== year)
    }));
  };

  return (
    <div className="bg-black h-full text-white flex overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block p-6 border-r border-gray-800 h-full overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Filters</h2>
          <p className="text-gray-500 text-xs mb-4">{games.length} Games found</p>

          {/* Apply Button */}
          <button
            onClick={handleApplyFilters}
            disabled={!hasFilterChanges}
            className={`w-full py-2 px-4 rounded font-bold text-sm transition-all duration-200 ${hasFilterChanges
              ? 'bg-red-600 hover:bg-red-700 text-white shadow-[0_0_10px_rgba(220,38,38,0.5)]'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
              }`}
          >
            {hasFilterChanges ? 'Apply Filters' : 'No Changes'}
          </button>
        </div>

        {filterOptions.genres.length > 0 && (
          <FilterSection title="Genre">
            {filterOptions.genres.map(genre => (
              <CheckboxFilter
                key={genre}
                label={genre}
                checked={filters.genres.includes(genre)}
                onChange={(checked) => handleGenreChange(genre, checked)}
              />
            ))}
          </FilterSection>
        )}

        {filterOptions.platforms.length > 0 && (
          <FilterSection title="Platform">
            {filterOptions.platforms.map(platform => (
              <CheckboxFilter
                key={platform}
                label={platform}
                checked={filters.platforms.includes(platform)}
                onChange={(checked) => handlePlatformChange(platform, checked)}
              />
            ))}
          </FilterSection>
        )}

        <FilterSection title="Price Range">
          <div className="px-1">
            {/* Dual-point range slider visualization */}
            <div className="relative h-1 bg-gray-700 rounded-lg mb-8">
              {/* Selected range highlight */}
              <div
                className="absolute h-full bg-red-600 rounded-lg"
                style={{
                  left: `${((filters.minPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`,
                  right: `${100 - ((filters.maxPrice - priceRange.min) / (priceRange.max - priceRange.min)) * 100}%`
                }}
              />

              {/* Min slider */}
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                value={filters.minPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, minPrice: Math.min(Number(e.target.value), prev.maxPrice) }))}
                className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
              />

              {/* Max slider */}
              <input
                type="range"
                min={priceRange.min}
                max={priceRange.max}
                value={filters.maxPrice}
                onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Math.max(Number(e.target.value), prev.minPrice) }))}
                className="absolute w-full h-1 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-600 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white"
              />
            </div>

            <div className="flex justify-between items-center text-xs space-x-2">
              {/* Min price - inline input */}
              {showPriceModal === 'min' ? (
                <input
                  type="number"
                  value={tempPriceInput}
                  onChange={(e) => setTempPriceInput(e.target.value)}
                  onBlur={handlePriceModalSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePriceModalSubmit();
                    if (e.key === 'Escape') setShowPriceModal(null);
                  }}
                  className="w-20 bg-gray-800 border border-red-600 text-white rounded px-2 py-1 focus:outline-none"
                  autoFocus
                />
              ) : (
                <span
                  className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                  onClick={() => handlePriceModalOpen('min')}
                  title="Click to edit"
                >
                  ${filters.minPrice}
                </span>
              )}

              {/* Max price - inline input */}
              {showPriceModal === 'max' ? (
                <input
                  type="number"
                  value={tempPriceInput}
                  onChange={(e) => setTempPriceInput(e.target.value)}
                  onBlur={handlePriceModalSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handlePriceModalSubmit();
                    if (e.key === 'Escape') setShowPriceModal(null);
                  }}
                  className="w-20 bg-gray-800 border border-red-600 text-white rounded px-2 py-1 focus:outline-none text-right"
                  autoFocus
                />
              ) : (
                <span
                  className="text-gray-400 hover:text-red-500 cursor-pointer transition-colors"
                  onClick={() => handlePriceModalOpen('max')}
                  title="Click to edit"
                >
                  ${filters.maxPrice}
                </span>
              )}
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Release Year">
          {['2025', '2024', '2023', '2022', 'Older'].map(year => (
            <CheckboxFilter
              key={year}
              label={year}
              checked={filters.releaseYears.includes(year)}
              onChange={(checked) => handleYearChange(year, checked)}
            />
          ))}
        </FilterSection>

        <FilterSection title="Rating">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all"
                  checked={filters.rating === stars}
                  onChange={(e) => setFilters(prev => ({ ...prev, rating: e.target.checked ? stars : 0 }))}
                />
                <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <svg
                    key={i}
                    className={`w-3 h-3 ${i < stars ? 'text-yellow-400' : 'text-gray-700'}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
                <span className="ml-2 text-xs text-gray-500">& Up</span>
              </div>
            </label>
          ))}
        </FilterSection>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white tracking-wider uppercase">
              Game <span className="text-red-600">Deals</span>
            </h1>
            <div className="flex items-center space-x-4">
              {/* Removed Entry Count Selection */}

              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <select
                  className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-red-600"
                  value={filters.sort}
                  onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                >
                  <option value="featured">Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="rating_desc">Rating: High to Low</option>
                  <option value="newest">Release Date</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-white">Loading game deals...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">Error: {error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {games.map((game) => (
                <ProductCard
                  key={game.id}
                  id={game.id}
                  steam_id={game.steam_id}
                  title={game.title}
                  price={game.price}
                  originalPrice={game.originalPrice}
                  image={game.image}
                  category={game.category}
                  rating={game.rating}
                  description={game.description}
                  isVerified={!!game.dealLastVerified}
                  className="h-[350px]"
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </main>
    </div>
  );
};

export default GameDeals;
