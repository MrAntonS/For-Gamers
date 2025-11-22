import React from 'react';
import { useCart } from '../contexts/CartContext';

export interface ProductCardProps {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: string;
  rating?: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  showAddToCart?: boolean;
  fallbackImage?: string;
  enableHoverReveal?: boolean;
  description?: string;
  brand?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  id,
  title, 
  price, 
  originalPrice, 
  image, 
  category, 
  rating, 
  className = "", 
  style,
  onClick,
  showAddToCart = true,
  fallbackImage = "https://placehold.co/400x600?text=No+Image",
  enableHoverReveal = false,
  description,
  brand
}) => {
  const { addToCart } = useCart();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart({
      id,
      name: title,
      price,
      originalPrice,
      image,
      category,
      brand
    });
  };

  return (
    <div
      className={`bg-gray-900 border border-gray-700 rounded-xl shadow-2xl transition-all duration-500 ease-out cursor-pointer hover:border-red-500 ${enableHoverReveal ? 'group relative hover:z-50 hover:rounded-b-none' : 'overflow-hidden'} ${className}`}
      style={style}
      onClick={onClick}
    >
      <div className={`h-3/5 w-full bg-gray-800 relative ${enableHoverReveal ? 'rounded-t-xl overflow-hidden' : ''}`}>
        <img 
          src={image} 
          alt={title} 
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackImage;
          }}
        />
        <div className="absolute top-1 right-1 2xl:top-2 2xl:right-2 bg-red-600 text-white text-[10px] 2xl:text-xs font-bold px-1.5 py-0.5 2xl:px-2 2xl:py-1 rounded">
          {category}
        </div>
      </div>
      <div className="p-2 2xl:p-4 text-left">
        <h3 className="text-sm 2xl:text-lg font-bold text-white truncate">{title}</h3>
        
        <div className="flex items-center justify-between mt-1 2xl:mt-2">
          <div className="flex items-baseline space-x-1 2xl:space-x-2">
            <span className="text-base 2xl:text-xl font-bold text-red-500">{price}</span>
            {originalPrice && (
              <span className="text-[10px] 2xl:text-sm text-gray-500 line-through">{originalPrice}</span>
            )}
          </div>

          {/* Star Rating */}
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <svg 
                key={i} 
                className={`w-3 h-3 2xl:w-4 2xl:h-4 ${i < (rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>

        {showAddToCart && !enableHoverReveal && (
          <button 
            onClick={handleAddToCart}
            className="mt-2 2xl:mt-3 w-full bg-white text-black text-xs 2xl:text-sm font-bold py-1 2xl:py-2 rounded hover:bg-gray-200 transition-colors"
          >
            Add to Cart
          </button>
        )}
      </div>

      {showAddToCart && enableHoverReveal && (
        <div className="absolute top-[calc(100%-1px)] -left-px -right-px bg-gray-900 border border-t-0 border-red-500 rounded-b-xl p-2 2xl:p-4 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto z-50">
          {description && (
            <p className="text-gray-400 text-[10px] 2xl:text-xs mb-2 line-clamp-2">{description}</p>
          )}
          <button 
            onClick={handleAddToCart}
            className="w-full bg-white text-black text-xs 2xl:text-sm font-bold py-1 2xl:py-2 rounded hover:bg-gray-200 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      )}
    </div>
  );
};

export default ProductCard;
