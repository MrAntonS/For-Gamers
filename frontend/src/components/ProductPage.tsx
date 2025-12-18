import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { API_BASE_URL } from '../config';

interface Product {
  id: number;
  steam_id?: number;
  title: string;
  name?: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  brand?: string;
  discount?: string;
  genres?: string[];
  pc_requirements?: string;
  mac_requirements?: string;
  linux_requirements?: string;
  dealEndsAt?: string;
  listings?: Product[];
  sellerInfo?: any;
  condition?: string;
  dealScore?: number;
}

// Countdown timer component for deal end dates
const DealCountdown: React.FC<{ endDate: string }> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
      });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (!timeLeft) {
    return <p className="text-red-400 text-xs mt-1">Deal has expired!</p>;
  }

  return (
    <div className="flex gap-2 mt-2">
      {timeLeft.days > 0 && (
        <div className="text-center">
          <span className="text-lg font-bold text-yellow-300">{timeLeft.days}</span>
          <span className="text-xs text-yellow-400/70 block">days</span>
        </div>
      )}
      <div className="text-center">
        <span className="text-lg font-bold text-yellow-300">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="text-xs text-yellow-400/70 block">hrs</span>
      </div>
      <div className="text-center">
        <span className="text-lg font-bold text-yellow-300">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="text-xs text-yellow-400/70 block">min</span>
      </div>
      <div className="text-center">
        <span className="text-lg font-bold text-yellow-300">{String(timeLeft.seconds).padStart(2, '0')}</span>
        <span className="text-xs text-yellow-400/70 block">sec</span>
      </div>
    </div>
  );
};

const ProductPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const category = searchParams.get('category') || 'Game';

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}?category=${category}`);
        if (!response.ok) {
          throw new Error('Product not found');
        }
        const data = await response.json();
        setProduct(data);

        // Trigger background verification for games
        if (category === 'Game') {
          fetch(`${API_BASE_URL}/api/products/${id}/verify?category=${category}`, {
            method: 'POST'
          }).catch(() => {
            // Silently ignore verification errors - it's not critical
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id, category]);

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id,
        name: product.title || product.name || 'Unknown Product',
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        category: product.category,
        brand: product.brand
      });
    }
  };

  const hasDiscount = product?.originalPrice && product.originalPrice !== product.price;

  if (loading) {
    return (
      <div className="min-h-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-full bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">{error || 'The product you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const productTitle = product.title || product.name || 'Unknown Product';

  return (
    <div className="min-h-full bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors group"
        >
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="relative">
            <div className="aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden bg-gray-900 border border-gray-800">
              <img
                src={imageError ? 'https://placehold.co/600x600?text=No+Image' : product.image}
                alt={productTitle}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />

              {/* Category Badge */}
              <div className="absolute top-4 left-4 bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                {product.category}
              </div>

              {/* Discount Badge */}
              {hasDiscount && product.discount && (
                <div className="absolute top-4 right-4 bg-green-600 text-white text-sm font-bold px-3 py-1 rounded-lg">
                  {product.discount}
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="flex flex-col">
            {/* Brand */}
            {product.brand && (
              <p className="text-red-500 text-sm font-semibold uppercase tracking-wider mb-2">
                {product.brand}
              </p>
            )}

            {/* Title */}
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              {productTitle}
            </h1>

            {/* Rating */}
            {product.rating !== undefined && product.rating > 0 && (
              <div className="flex items-center mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-5 h-5 ${i < Math.round(product.rating!) ? 'text-yellow-400' : 'text-gray-600'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="ml-2 text-gray-400 text-sm">
                  {product.rating.toFixed(1)} / 5.0
                </span>
                {product.reviewCount !== undefined && product.reviewCount > 0 && (
                  <span className="ml-3 text-gray-500 text-sm">
                    ({product.reviewCount.toLocaleString()} reviews)
                  </span>
                )}
              </div>
            )}

            {/* Genres (for games) */}
            {product.genres && product.genres.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {product.genres.map((genre, index) => (
                  <span
                    key={index}
                    className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            )}

            {/* Price Section */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <div className="flex items-baseline gap-4 mb-4">
                <span className="text-4xl font-bold text-red-500">
                  {product.price}
                </span>
                {hasDiscount && (
                  <span className="text-xl text-gray-500 line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>

              {hasDiscount && (
                <p className="text-green-500 text-sm mb-2">
                  You save {product.discount} on this purchase!
                </p>
              )}

              {/* Deal End Date */}
              {product.dealEndsAt && (
                <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">
                      Deal ends: {new Date(product.dealEndsAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <DealCountdown endDate={product.dealEndsAt} />
                </div>
              )}

              <p className="text-gray-500 text-xs mb-4 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {product.dealLastVerified
                  ? `Deal verified: ${new Date(product.dealLastVerified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                  : "This deal hasn't been verified yet"
                }
              </p>

              <button
                onClick={handleAddToCart}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Add to Cart
              </button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-6">
                <h2 className="text-xl font-bold text-white mb-3">Description</h2>
                <p className="text-gray-400 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Hardware Deals List */}
            {product.listings && product.listings.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  Available Deals
                  <span className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">{product.listings.length}</span>
                </h2>
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {product.listings.map((item, idx) => (
                    <div key={item.id || idx} className="p-4 border-b border-gray-800 last:border-0 flex items-center gap-4 hover:bg-gray-800/50 transition-colors">
                      {/* Image */}
                      <div className="w-16 h-16 bg-gray-800 rounded-lg overflow-hidden shrink-0">
                        <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white truncate text-sm">{item.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          {item.condition && <span className="bg-gray-800 px-2 py-0.5 rounded">{item.condition}</span>}
                          {item.sellerInfo && (
                            <span>Seller: {item.sellerInfo.username} ({item.sellerInfo.feedbackScore})</span>
                          )}
                        </div>
                      </div>

                      {/* Price & Action */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-red-500 text-lg">{item.price}</div>
                        <button
                          onClick={() => window.open(`https://ebay.com/itm/${item.id}`, '_blank')}
                          className="text-xs bg-white text-black font-bold px-3 py-1.5 rounded hover:bg-gray-200 mt-1"
                        >
                          View Deal
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Steam Link (for games) */}
            {product.steam_id && (
              <a
                href={`https://store.steampowered.com/app/${product.steam_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89l-2.54 1.04a.75.75 0 01-.958-.344l-.5-.866a.75.75 0 01.344-.958l3.108-1.27a2.25 2.25 0 011.716 0l3.108 1.27a.75.75 0 01.344.958l-.5.866a.75.75 0 01-.958.344l-2.54-1.04v6.989C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
                View on Steam
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* System Requirements (for games) */}
        {product.category === 'Game' && product.pc_requirements && (
          <SystemRequirements requirements={product.pc_requirements} />
        )}
      </div>
    </div>
  );
};

// Helper component to render system requirements nicely
const SystemRequirements: React.FC<{ requirements: string }> = ({ requirements }) => {
  // Try to parse JSON requirements
  let parsed: {
    minimum?: Record<string, string>;
    recommended?: Record<string, string>;
  } | null = null;

  try {
    parsed = JSON.parse(requirements);
  } catch {
    // If it's not JSON, render as HTML (legacy format)
    return (
      <div className="mt-12 border-t border-gray-800 pt-8">
        <h2 className="text-2xl font-bold text-white mb-6">System Requirements</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div
            className="text-gray-400 prose prose-invert max-w-none prose-headings:text-white prose-strong:text-white"
            dangerouslySetInnerHTML={{ __html: requirements }}
          />
        </div>
      </div>
    );
  }

  const labelMap: Record<string, string> = {
    os: 'Operating System',
    processor: 'Processor',
    memory: 'Memory',
    graphics: 'Graphics',
    storage: 'Storage',
    directx: 'DirectX',
    network: 'Network',
    sound: 'Sound Card',
  };

  const iconMap: Record<string, React.ReactNode> = {
    os: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    processor: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    memory: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    graphics: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    ),
    storage: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    ),
    directx: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    network: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    sound: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    ),
  };

  const defaultIcon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  const renderRequirementSection = (title: string, reqs: Record<string, string> | undefined, accentColor: string) => {
    if (!reqs) return null;

    return (
      <div className="flex-1 min-w-[280px]">
        <div className={`flex items-center gap-2 mb-4 pb-2 border-b border-gray-700`}>
          <div className={`w-2 h-2 rounded-full ${accentColor}`}></div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(reqs).map(([key, value]) => (
            <div key={key} className="flex items-start gap-3">
              <div className="text-gray-500 mt-0.5">
                {iconMap[key.toLowerCase()] || defaultIcon}
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs uppercase tracking-wider">
                  {labelMap[key.toLowerCase()] || key}
                </p>
                <p className="text-gray-300 text-sm">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-12 border-t border-gray-800 pt-8">
      <h2 className="text-2xl font-bold text-white mb-6">System Requirements</h2>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex flex-wrap gap-8">
          {renderRequirementSection('Minimum', parsed?.minimum, 'bg-yellow-500')}
          {renderRequirementSection('Recommended', parsed?.recommended, 'bg-green-500')}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
