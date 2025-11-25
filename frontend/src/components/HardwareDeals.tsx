import React, { useState, useEffect } from 'react';
import ProductCard from './ProductCard';
import Pagination from './Pagination';
import { API_BASE_URL } from '../config';

interface HardwareDeal {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  category: string;
  image: string;
  rating: number;
  description?: string;
}

const FilterSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-6">
    <h3 className="text-red-500 font-bold uppercase tracking-wider mb-3 text-sm">{title}</h3>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const CheckboxFilter = ({ label }: { label: string }) => (
  <label className="flex items-center space-x-3 cursor-pointer group">
    <div className="relative flex items-center">
      <input type="checkbox" className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all" />
      <svg className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <span className="text-gray-400 group-hover:text-white transition-colors text-sm">{label}</span>
  </label>
);

const HardwareDeals = () => {
  const [hardware, setHardware] = useState<HardwareDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState(2000);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchHardware = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products?category=Hardware&page=${currentPage}&limit=18`);
        if (!response.ok) {
          throw new Error('Failed to fetch hardware deals');
        }
        const data = await response.json();
        const mappedHardware = data.products.map((p: any) => ({
          id: p.id,
          title: p.name,
          price: p.price,
          originalPrice: p.originalPrice,
          category: p.category,
          image: p.image,
          rating: p.rating,
          description: p.description
        }));
        setHardware(mappedHardware);
        setTotalPages(data.total_pages || 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchHardware();
  }, [currentPage]);

  return (
    <div className="bg-black h-full text-white flex overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block p-6 border-r border-gray-800 h-full overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">Filters</h2>
          <p className="text-gray-500 text-xs">{hardware.length} Products found</p>
        </div>

        <FilterSection title="Component Type">
          <CheckboxFilter label="GPU (Graphics Card)" />
          <CheckboxFilter label="CPU (Processor)" />
          <CheckboxFilter label="Motherboard" />
          <CheckboxFilter label="RAM (Memory)" />
          <CheckboxFilter label="Storage (SSD/HDD)" />
          <CheckboxFilter label="Power Supply" />
          <CheckboxFilter label="Cooling" />
          <CheckboxFilter label="Case" />
        </FilterSection>

        <FilterSection title="Peripherals">
          <CheckboxFilter label="Mouse" />
          <CheckboxFilter label="Keyboard" />
          <CheckboxFilter label="Headset" />
          <CheckboxFilter label="Monitor" />
          <CheckboxFilter label="Webcam" />
          <CheckboxFilter label="Microphone" />
          <CheckboxFilter label="Controller" />
        </FilterSection>

        <FilterSection title="Brand">
          <CheckboxFilter label="NVIDIA" />
          <CheckboxFilter label="AMD" />
          <CheckboxFilter label="Intel" />
          <CheckboxFilter label="Corsair" />
          <CheckboxFilter label="Logitech" />
          <CheckboxFilter label="Razer" />
          <CheckboxFilter label="Samsung" />
          <CheckboxFilter label="ASUS" />
        </FilterSection>

        <FilterSection title="Price Range">
          <div className="px-1">
            <input 
              type="range" 
              min="0" 
              max="2000" 
              value={priceRange} 
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
            />
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>$0</span>
              <span>${priceRange}</span>
            </div>
          </div>
        </FilterSection>

        <FilterSection title="Condition">
          <CheckboxFilter label="New" />
          <CheckboxFilter label="Refurbished" />
          <CheckboxFilter label="Open Box" />
        </FilterSection>

        <FilterSection title="Rating">
          {[5, 4, 3, 2, 1].map((stars) => (
            <label key={stars} className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative flex items-center">
                <input type="checkbox" className="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-600 bg-gray-900 checked:border-red-600 checked:bg-red-600 transition-all" />
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
              Hardware <span className="text-red-600">Deals</span>
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Show:</span>
                <select className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-2 py-1 focus:outline-none focus:border-red-600">
                  <option>20</option>
                  <option>40</option>
                  <option>60</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-sm">Sort by:</span>
                <select className="bg-gray-900 border border-gray-700 text-white text-sm rounded px-3 py-1 focus:outline-none focus:border-red-600">
                  <option>Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Rating: High to Low</option>
                  <option>Newest Arrivals</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-white">Loading hardware deals...</div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">Error: {error}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
              {hardware.map((item) => (
                <ProductCard
                  key={item.id}
                  id={item.id}
                  title={item.title}
                  price={item.price}
                  originalPrice={item.originalPrice}
                  image={item.image}
                  category={item.category}
                  rating={item.rating}
                  description={item.description}
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

export default HardwareDeals;
