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
}

/* const dummyProducts: Product[] = [
  {
    id: 1,
    name: "Cyberpunk 2077",
    price: "$29.99",
    originalPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-50%",
    rating: 4.5,
    brand: "CD Projekt Red",
    description: "An open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification."
  },
  {
    id: 2,
    name: "RTX 4070 Ti",
    price: "$799.99",
    originalPrice: "$899.99",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-11%",
    rating: 4.8,
    brand: "NVIDIA",
    description: "The GeForce RTX 4070 Ti delivers the ultra performance and features that enthusiast gamers and creators demand."
  },
  {
    id: 3,
    name: "Elden Ring",
    price: "$39.99",
    originalPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-33%",
    rating: 5.0,
    brand: "FromSoftware",
    description: "A fantasy action-RPG adventure set within a world created by Hidetaka Miyazaki and George R.R. Martin."
  },
  {
    id: 4,
    name: "Gaming Mouse Pro",
    price: "$49.99",
    originalPrice: "$89.99",
    image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-45%",
    rating: 4.6,
    brand: "Logitech",
    description: "Engineered for pro-grade performance, responsiveness, and durability. The ultimate weapon for your gaming arsenal."
  },
  {
    id: 5,
    name: "God of War",
    price: "$49.99",
    originalPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-15%",
    rating: 4.9,
    brand: "Sony",
    description: "His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters."
  },
  {
    id: 6,
    name: "Mechanical Keyboard",
    price: "$129.99",
    originalPrice: "$159.99",
    image: "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-20%",
    rating: 4.7,
    brand: "Corsair",
    description: "The iconic mechanical gaming keyboard with an aircraft-grade aluminum frame and dynamic RGB backlighting."
  },
  {
    id: 7,
    name: "Xbox Series X",
    price: "$449.99",
    originalPrice: "$499.99",
    image: "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-10%",
    rating: 4.8,
    brand: "Microsoft",
    description: "The fastest, most powerful Xbox ever. Explore rich new worlds with 12 teraflops of raw graphic processing power."
  },
  {
    id: 8,
    name: "PlayStation 5",
    price: "$499.99",
    originalPrice: "$499.99",
    image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "0%",
    rating: 4.9,
    brand: "Sony",
    description: "Experience lightning fast loading with an ultra-high speed SSD, deeper immersion with haptic feedback, and 3D Audio."
  },
  {
    id: 9,
    name: "Nintendo Switch OLED",
    price: "$349.99",
    originalPrice: "$349.99",
    image: "https://images.unsplash.com/photo-1578303512597-81e6cc155b3e?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "0%",
    rating: 4.7,
    brand: "Nintendo",
    description: "Play at home on the TV or on-the-go with a vibrant 7-inch OLED screen with the Nintendo Switch – OLED Model system."
  },
  {
    id: 10,
    name: "The Witcher 3",
    price: "$19.99",
    originalPrice: "$39.99",
    image: "https://images.unsplash.com/photo-1519669556878-63bdad8a1a49?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-50%",
    rating: 4.9,
    brand: "CD Projekt Red",
    description: "You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will."
  },
  {
    id: 11,
    name: "Red Dead Redemption 2",
    price: "$29.99",
    originalPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-50%",
    rating: 4.9,
    brand: "Rockstar Games",
    description: "Winner of over 175 Game of the Year Awards and recipient of over 250 perfect scores, RDR2 is an epic tale of honor and loyalty."
  },
  {
    id: 12,
    name: "Hogwarts Legacy",
    price: "$59.99",
    originalPrice: "$69.99",
    image: "https://images.unsplash.com/photo-1633114128174-2f8aa49759b0?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-14%",
    rating: 4.6,
    brand: "Warner Bros",
    description: "Hogwarts Legacy is an immersive, open-world action RPG set in the world first introduced in the Harry Potter books."
  },
  {
    id: 13,
    name: "Gaming Headset",
    price: "$79.99",
    originalPrice: "$99.99",
    image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-20%",
    rating: 4.4,
    brand: "Razer",
    description: "Immersive 7.1 surround sound for positional audio. Ultra-lightweight design for prolonged gaming marathons."
  },
  {
    id: 14,
    name: "4K Gaming Monitor",
    price: "$399.99",
    originalPrice: "$499.99",
    image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-20%",
    rating: 4.7,
    brand: "LG",
    description: "Experience your games in stunning 4K resolution with a 144Hz refresh rate and 1ms response time for competitive gaming."
  },
  {
    id: 15,
    name: "SSD 2TB",
    price: "$129.99",
    originalPrice: "$159.99",
    image: "https://images.unsplash.com/photo-1628557044797-f21a177c37ec?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-19%",
    rating: 4.8,
    brand: "Samsung",
    description: "Reach max performance of PCIe 4.0. Experience longer-lasting, opponent-blasting speed. The smart heat control delivers power efficiency."
  },
  {
    id: 16,
    name: "DDR5 RAM 32GB",
    price: "$109.99",
    originalPrice: "$139.99",
    image: "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-21%",
    rating: 4.7,
    brand: "G.Skill",
    description: "Push the limits of performance with DDR5 memory. Faster frequencies, greater capacities, and better performance."
  },
  {
    id: 17,
    name: "Gaming Chair",
    price: "$199.99",
    originalPrice: "$249.99",
    image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-20%",
    rating: 4.3,
    brand: "Secretlab",
    description: "Ergonomic design for all-day comfort. Features adjustable lumbar support, 4D armrests, and premium PU leather."
  },
  {
    id: 18,
    name: "Webcam 4K",
    price: "$149.99",
    originalPrice: "$199.99",
    image: "https://images.unsplash.com/photo-1587826337417-96fff778df71?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-25%",
    rating: 4.5,
    brand: "Logitech",
    description: "Look your best in every video meeting and stream. Ultra 4K HD resolution with HDR technology for clear video in any light."
  },
  {
    id: 19,
    name: "Microphone",
    price: "$129.99",
    originalPrice: "$149.99",
    image: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-13%",
    rating: 4.6,
    brand: "Blue",
    description: "The ultimate professional USB microphone. Tri-capsule array records almost any situation. Multiple pattern selection."
  },
  {
    id: 20,
    name: "Capture Card",
    price: "$179.99",
    originalPrice: "$199.99",
    image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80",
    category: "Hardware",
    discount: "-10%",
    rating: 4.7,
    brand: "Elgato",
    description: "Record and stream your gaming gameplay in 1080p60 HDR10 quality. Plug and play functionality with ultra-low latency."
  }
]; */

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

const ProductList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState(1000);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/products?page=${currentPage}&limit=48`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products);
        setTotalPages(data.total_pages);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [currentPage]);

  return (
    <div className="bg-black h-full text-white flex overflow-hidden">
      {/* Sidebar Filters */}
      <aside className="w-64 hidden md:block p-6 border-r border-gray-800 h-full overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">Filters</h2>
          <p className="text-gray-500 text-xs">1,240 Products found</p>
        </div>

        <FilterSection title="Categories">
          <CheckboxFilter label="Games" />
          <CheckboxFilter label="Consoles" />
          <CheckboxFilter label="Components" />
          <CheckboxFilter label="Peripherals" />
          <CheckboxFilter label="Merchandise" />
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

        <FilterSection title="Brands">
          <CheckboxFilter label="NVIDIA" />
          <CheckboxFilter label="AMD" />
          <CheckboxFilter label="Sony" />
          <CheckboxFilter label="Nintendo" />
          <CheckboxFilter label="Logitech" />
          <CheckboxFilter label="Razer" />
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
              All <span className="text-red-600">Products</span>
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
                  <option>Newest Arrivals</option>
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
                  className="h-[350px]"
                  enableHoverReveal={true}
                  description={product.description}
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
