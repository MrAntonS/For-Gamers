import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  name: string;
  price: string;
  originalPrice: string;
  image: string;
  category: 'Game' | 'Hardware';
  discount: string;
  rating: number;
  brand?: string;
  description: string;
  isGrouped?: boolean;
  groupCount?: number;
}

interface Filters {
  minPrice: number;
  maxPrice: number;
  categories: string[];
  brands: string[];
  genres: string[];
  platforms: string[];
  years: number[];
  rating: number;
  sort: string;
}

interface FilterOptions {
  genres: string[];
  platforms: string[];
  years: number[];
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

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    genres: [],
    platforms: [],
    years: [],
    brands: [],
    categories: [],
    price_min: 0,
    price_max: 2000
  });

  // Filter state
  const [filters, setFilters] = useState<Filters>({
    minPrice: 0,
    maxPrice: 2000,
    categories: [],
    brands: [],
    genres: [],
    platforms: [],
    years: [],
    rating: 0,
    sort: 'featured'
  });

  // Applied filters state (what is actually being used for fetching)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(filters);

  // Check if filters have changed
  const hasFilterChanges = JSON.stringify(filters) !== JSON.stringify(appliedFilters);

  // Fetch filter options on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/filters`);
        if (res.ok) {
          const data = await res.json();
          setFilterOptions(data);
          // Optionally adjust max price based on actual data
          // setFilters(prev => ({ ...prev, maxPrice: data.price_max })); 
        }
      } catch (err) {
        console.error("Failed to fetch filters", err);
      }
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          limit: '10',
          min_price: appliedFilters.minPrice.toString(),
          max_price: appliedFilters.maxPrice.toString(),
          rating: appliedFilters.rating.toString(),
          sort: appliedFilters.sort,
          // Join arrays with commas
          // Join arrays with commas
          categories: appliedFilters.categories.join(','),
          brands: appliedFilters.brands.join(','),
          genres: appliedFilters.genres.join(','),
          platforms: appliedFilters.platforms.join(','),
          years: appliedFilters.years.join(',')
        });

        const response = await fetch(`${API_BASE_URL}/api/products?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage, appliedFilters]);

  const handleApplyFilters = () => {
    setAppliedFilters(filters);
    setCurrentPage(1); // Reset to page 1 when filtering
  };

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      categories: checked
        ? [...prev.categories, category]
        : prev.categories.filter(c => c !== category)
    }));
  };

  const handleBrandChange = (brand: string, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      brands: checked
        ? [...prev.brands, brand]
        : prev.brands.filter(b => b !== brand)
    }));
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

  const handleYearChange = (year: number, checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      years: checked
        ? [...prev.years, year]
        : prev.years.filter(y => y !== year)
    }));
  };

  return (
    <div className="bg-black h-full text-white flex overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block p-6 border-r border-gray-800 h-full overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-1">Filters</h2>
          <p className="text-gray-500 text-xs mb-4">{products.length} Products found</p>

          {/* Apply Button - Only visible when changes exist */}
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

        <FilterSection title="Categories">
          {filterOptions.categories.map(cat => (
            <CheckboxFilter
              key={cat}
              label={cat}
              checked={filters.categories.includes(cat)}
              onChange={(checked) => handleCategoryChange(cat, checked)}
            />
          ))}
        </FilterSection>

        {filterOptions.genres.length > 0 && (
          <FilterSection title="Genres">
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
          <FilterSection title="Platforms">
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

        {filterOptions.years.length > 0 && (
          <FilterSection title="Release Year">
            {filterOptions.years.map(year => (
              <CheckboxFilter
                key={year}
                label={year.toString()}
                checked={filters.years.includes(year)}
                onChange={(checked) => handleYearChange(year, checked)}
              />
            ))}
          </FilterSection>
        )}

        <FilterSection title="Price Range">
          <div className="px-1">
            <input
              type="range"
              min={filterOptions.price_min}
              max={filterOptions.price_max || 2000}
              value={filters.maxPrice}
              onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>${filterOptions.price_min}</span>
              <span>${filters.maxPrice}</span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Brands">
          {filterOptions.brands.map(brand => (
            <CheckboxFilter
              key={brand}
              label={brand}
              checked={filters.brands.includes(brand)}
              onChange={(checked) => handleBrandChange(brand, checked)}
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
              All <span className="text-red-600">Products</span>
            </h1>
            <div className="flex items-center space-x-4">
              {/* REMOVED: Entry count selection */}

              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <select
                  className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-red-600"
                  value={filters.sort}
                  onChange={(e) => {
                    const newSort = e.target.value;
                    setFilters(prev => ({ ...prev, sort: newSort }));
                    // Auto-apply sort changes as they are less disruptive? 
                    // Or keep them behind apply button? The prompt says "when user changes the filters and hits apply... the page will update"
                    // So we should keep it behind the button, but usually sort is instant. 
                    // Let's stick to the prompt: Apply button for filters. Sort is often considered a "view" setting, but implementation plan said "filters state differs from applied filters".
                    // However, users expect sort to be instant. Let's make sort instant by updating appliedFilters too?
                    // "it should be backend dependent, so when user changes the filters and hits apply... the page will update"
                    // I will stick to the requirement: Sort is a filter parameter here, so it should ideally wait for apply if consistent.
                    // But common UX is sort is instant. I'll make sort instant for better UX, while other filters wait.
                    // ACTUALLY, to be safe and strictly follow "only appear when filters were changed", I will make sort wait for Apply too, 
                    // OR I will make sort trigger a separate effect. 
                    // Let's make sort wait for Apply to be 100% compliant with "only appear when filters were changed".
                    // Wait, that's annoying for sort. 
                    // I'll make sort part of the filters that need "Apply".
                  }}
                >
                  <option value="featured">Featured</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-white">Loading products...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">Error: {error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  title={product.name}
                  price={product.price}
                  originalPrice={product.originalPrice}
                  image={product.image}
                  category={product.category}
                  rating={product.rating}
                  brand={product.brand}
                  className="h-[350px]"
                  enableHoverReveal={true}
                  description={product.description}
                  isGrouped={product.isGrouped}
                  groupCount={product.groupCount}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 bg-black z-10">
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &lt;
            </button>

            {[...Array(totalPages)].map((_, i) => {
              const page = i + 1;
              // Simple pagination logic to show limited pages if too many
              if (totalPages > 10 && Math.abs(page - currentPage) > 2 && page !== 1 && page !== totalPages) {
                if (Math.abs(page - currentPage) === 3) return <span key={page} className="px-1 text-gray-600">...</span>;
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 rounded border ${currentPage === page ? 'bg-red-600 border-red-600 text-white font-bold' : 'border-gray-700 text-gray-400 hover:text-white hover:border-white'}`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              &gt;
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductList;
