import React, { useState } from 'react';

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
}

const dummyProducts: Product[] = [
  {
    id: 1,
    name: "Cyberpunk 2077",
    price: "$29.99",
    originalPrice: "$59.99",
    image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80",
    category: "Game",
    discount: "-50%",
    rating: 4.5,
    brand: "CD Projekt Red"
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
    brand: "NVIDIA"
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
    brand: "FromSoftware"
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
    brand: "Logitech"
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
    brand: "Sony"
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
    brand: "Corsair"
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
    brand: "Microsoft"
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
    brand: "Sony"
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
    brand: "Nintendo"
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
    brand: "CD Projekt Red"
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
    brand: "Rockstar Games"
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
    brand: "Warner Bros"
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
    brand: "Razer"
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
    brand: "LG"
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
    brand: "Samsung"
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
    brand: "G.Skill"
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
    brand: "Secretlab"
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
    brand: "Logitech"
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
    brand: "Blue"
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
    brand: "Elgato"
  }
];

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
  const [priceRange, setPriceRange] = useState(1000);

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
        
        <div className="flex-1 overflow-y-auto p-4 pt-0 min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {dummyProducts.map((product) => (
              <div 
                key={product.id} 
                className="group relative bg-gray-900 rounded-lg border border-gray-800 hover:border-red-600 transition-all duration-300 ease-out hover:shadow-xl hover:shadow-red-900/20 hover:-translate-y-1 hover:z-50 hover:rounded-b-none flex flex-col"
              >
                {/* Image Container */}
                <div className="aspect-video w-full overflow-hidden bg-gray-800 relative rounded-t-lg">
                  <img 
                    src={product.image} 
                    alt={product.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                    {product.discount}
                  </span>
                  <span className="absolute top-1 left-1 bg-black/80 backdrop-blur-sm text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-gray-700">
                    {product.category}
                  </span>
                </div>
                
                {/* Content Container */}
                <div className="p-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-white truncate mb-0.5">{product.name}</h3>
                    <p className="text-[9px] text-gray-500 mb-1">{product.brand}</p>
                  </div>
                  
                  <div>
                    <div className="flex items-end justify-between mb-1">
                      <div>
                        <p className="text-gray-500 text-[9px] line-through">{product.originalPrice}</p>
                        <p className="text-red-500 text-sm font-bold">{product.price}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extended Content (Absolute Footer) */}
                <div className="absolute top-full -left-px -right-px bg-gray-900 border border-t-0 border-red-600 rounded-b-lg p-2 shadow-xl shadow-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                  <div className="pt-1 border-t border-gray-800">
                    <div className="flex items-center mb-1">
                      {[...Array(5)].map((_, i) => (
                        <svg 
                          key={i} 
                          className={`w-2 h-2 ${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-600'}`} 
                          fill="currentColor" 
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="text-[9px] text-gray-400 ml-1">({product.rating})</span>
                    </div>
                    <button className="w-full bg-white hover:bg-gray-200 text-black font-bold py-1 px-2 rounded text-[10px] transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 bg-black z-10">
          <div className="flex justify-center space-x-2">
            <button className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white disabled:opacity-50 disabled:cursor-not-allowed">
              &lt;
            </button>
            <button className="px-3 py-1 rounded bg-red-600 text-white font-bold">1</button>
            <button className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white">2</button>
            <button className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white">3</button>
            <span className="px-2 py-1 text-gray-500">...</span>
            <button className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white">12</button>
            <button className="px-3 py-1 rounded border border-gray-700 text-gray-400 hover:text-white hover:border-white">
              &gt;
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProductList;
