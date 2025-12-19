import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  title: string;
  price: string;
  originalPrice: string;
  image: string;
  category: 'Game' | 'Hardware';
  discount: string;
  rating: number;
  brand?: string;
  description: string;
}

interface FilterState {
  // Game-specific filters
  genres: string[];
  platforms: string[];
  releaseYears: string[];
  // Hardware-specific filters
  componentTypes: string[];
  peripherals: string[];
  brands: string[];
  conditions: string[];
  // Common filters
  ratings: number[];
  priceRange: number;
}

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="text-red-500 font-bold uppercase tracking-wider mb-3 text-sm">{title}</h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

interface CheckboxFilterProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const CheckboxFilter = ({ label, checked, onChange, disabled = false }: CheckboxFilterProps) => (
  <label className={`flex items-center space-x-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
    <div className="relative flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all disabled:cursor-not-allowed"
      />
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span className={`text-gray-400 transition-colors text-sm ${disabled ? '' : 'group-hover:text-white'}`}>{label}</span>
  </label>
);

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  const [filters, setFilters] = useState<FilterState>({
    genres: [],
    platforms: [],
    releaseYears: [],
    componentTypes: [],
    peripherals: [],
    brands: [],
    conditions: [],
    ratings: [],
    priceRange: 2000
  });

  // Determine if game-specific or hardware-specific filters are active
  const hasGameFilters = filters.genres.length > 0 || filters.platforms.length > 0 || filters.releaseYears.length > 0;
  const hasHardwareFilters = filters.componentTypes.length > 0 || filters.peripherals.length > 0 || filters.conditions.length > 0;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Build category filter based on active filters
        let categoryParam = '';
        if (hasGameFilters && !hasHardwareFilters) {
          categoryParam = '&category=Game';
        } else if (hasHardwareFilters && !hasGameFilters) {
          categoryParam = '&category=Hardware';
        }

        const response = await fetch(
          `${API_BASE_URL}/api/products?search=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=18${categoryParam}`
        );
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.total_pages);
        setTotalProducts(data.total_products);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, currentPage, hasGameFilters, hasHardwareFilters]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const toggleFilter = <K extends keyof FilterState>(
    category: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ) => {
    setFilters(prev => {
      const currentValues = prev[category] as unknown[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [category]: newValues };
    });
  };

  const isFilterChecked = <K extends keyof FilterState>(
    category: K,
    value: FilterState[K] extends (infer U)[] ? U : never
  ): boolean => {
    return (filters[category] as unknown[]).includes(value);
  };

  // Game filter options
  const genreOptions = ['Action', 'RPG', 'Adventure', 'Strategy', 'Simulation', 'Sports', 'Racing', 'Shooter'];
  const platformOptions = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Steam Deck'];
  const releaseYearOptions = ['2025', '2024', '2023', '2022', 'Older'];

  // Hardware filter options
  const componentTypeOptions = ['GPU (Graphics Card)', 'CPU (Processor)', 'Motherboard', 'RAM (Memory)', 'Storage (SSD/HDD)', 'Power Supply', 'Cooling', 'Case'];
  const peripheralOptions = ['Mouse', 'Keyboard', 'Headset', 'Monitor', 'Webcam', 'Microphone', 'Controller'];
  const brandOptions = ['NVIDIA', 'AMD', 'Intel', 'Corsair', 'Logitech', 'Razer', 'Samsung', 'ASUS'];
  const conditionOptions = ['New', 'Refurbished', 'Open Box'];

  return (
    <div className="bg-black h-full text-white flex overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block p-6 border-r border-gray-800 h-full overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">Filters</h2>
          <p className="text-gray-500 text-xs">{totalProducts} Products found</p>
          {searchQuery && (
            <p className="text-gray-400 text-xs mt-1">
              Searching for: "<span className="text-red-500">{searchQuery}</span>"
            </p>
          )}
        </div>

        {/* Game-specific Filters */}
        <div className={hasHardwareFilters ? 'opacity-50' : ''}>
          <FilterSection title="Genre (Games Only)">
            {genreOptions.map(genre => (
              <CheckboxFilter
                key={genre}
                label={genre}
                checked={isFilterChecked('genres', genre)}
                onChange={() => toggleFilter('genres', genre)}
                disabled={hasHardwareFilters}
              />
            ))}
          </FilterSection>

          <FilterSection title="Platform (Games Only)">
            {platformOptions.map(platform => (
              <CheckboxFilter
                key={platform}
                label={platform}
                checked={isFilterChecked('platforms', platform)}
                onChange={() => toggleFilter('platforms', platform)}
                disabled={hasHardwareFilters}
              />
            ))}
          </FilterSection>

          <FilterSection title="Release Year (Games Only)">
            {releaseYearOptions.map(year => (
              <CheckboxFilter
                key={year}
                label={year}
                checked={isFilterChecked('releaseYears', year)}
                onChange={() => toggleFilter('releaseYears', year)}
                disabled={hasHardwareFilters}
              />
            ))}
          </FilterSection>
        </div>

        {/* Hardware-specific Filters */}
        <div className={hasGameFilters ? 'opacity-50' : ''}>
          <FilterSection title="Component Type (Hardware Only)">
            {componentTypeOptions.map(type => (
              <CheckboxFilter
                key={type}
                label={type}
                checked={isFilterChecked('componentTypes', type)}
                onChange={() => toggleFilter('componentTypes', type)}
                disabled={hasGameFilters}
              />
            ))}
          </FilterSection>

          <FilterSection title="Peripherals (Hardware Only)">
            {peripheralOptions.map(peripheral => (
              <CheckboxFilter
                key={peripheral}
                label={peripheral}
                checked={isFilterChecked('peripherals', peripheral)}
                onChange={() => toggleFilter('peripherals', peripheral)}
                disabled={hasGameFilters}
              />
            ))}
          </FilterSection>

          <FilterSection title="Brand (Hardware Only)">
            {brandOptions.map(brand => (
              <CheckboxFilter
                key={brand}
                label={brand}
                checked={isFilterChecked('brands', brand)}
                onChange={() => toggleFilter('brands', brand)}
                disabled={hasGameFilters}
              />
            ))}
          </FilterSection>

          <FilterSection title="Condition (Hardware Only)">
            {conditionOptions.map(condition => (
              <CheckboxFilter
                key={condition}
                label={condition}
                checked={isFilterChecked('conditions', condition)}
                onChange={() => toggleFilter('conditions', condition)}
                disabled={hasGameFilters}
              />
            ))}
          </FilterSection>
        </div>

        {/* Common Filters */}
        <FilterSection title="Price Range">
          <div className="px-1">
            <input
              type="range"
              min="0"
              max="2000"
              value={filters.priceRange}
              onChange={(e) => setFilters(prev => ({ ...prev, priceRange: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>$0</span>
              <span>${filters.priceRange}</span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Rating">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={filters.ratings.includes(stars)}
                  onChange={() => toggleFilter('ratings', stars)}
                  className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all"
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

        {/* Filter Info */}
        {(hasGameFilters || hasHardwareFilters) && (
          <div className="mt-4 p-3 bg-gray-800 rounded-lg">
            <p className="text-xs text-gray-400">
              {hasGameFilters && (
                <span className="text-yellow-500">⚠ Game filters active - Hardware excluded</span>
              )}
              {hasHardwareFilters && (
                <span className="text-yellow-500">⚠ Hardware filters active - Games excluded</span>
              )}
            </p>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-white tracking-wider uppercase">
              Search <span className="text-red-600">Results</span>
              {searchQuery && (
                <span className="text-gray-400 text-lg ml-2">
                  for "{searchQuery}"
                </span>
              )}
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <select className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-red-600">
                  <option>Relevance</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Rating: High to Low</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-white">Searching...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">Error: {error}</div>
          ) : products.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400 text-lg">No results found for "{searchQuery}"</p>
              <p className="text-gray-500 text-sm mt-2">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.title}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  image={product.image}
                  category={product.category}
                  rating={product.rating}
                  brand={product.brand}
                  description={product.description}
                  className="h-[350px]"
                  enableHoverReveal={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {products.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </main>
    </div>
  );
};

export default SearchResults;
