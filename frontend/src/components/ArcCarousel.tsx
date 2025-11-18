import React, { useState, useEffect, useRef } from 'react';

export interface DealItem {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: string;
  rating?: number;
}

interface ArcCarouselProps {
  items: DealItem[];
  side: 'left' | 'right';
  fallbackImage?: string;
}

const CardImage = ({ src, alt, fallbackSrc }: { src: string, alt: string, fallbackSrc: string }) => {
  const [imgSrc, setImgSrc] = useState(src);

  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <img 
      src={imgSrc} 
      alt={alt} 
      className="w-full h-full object-cover"
      onError={() => setImgSrc(fallbackSrc)}
    />
  );
};

const ArcCarousel: React.FC<ArcCarouselProps> = ({ items, side, fallbackImage = "https://placehold.co/400x600?text=No+Image" }) => {
  const [activeIndex, setActiveIndex] = useState(Math.floor(items.length / 2));
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [items.length, activeIndex]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  // Prevent default scroll behavior when hovering the carousel
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: WheelEvent) => {
      e.preventDefault();
    };

    container.addEventListener('wheel', preventDefault, { passive: false });
    return () => {
      container.removeEventListener('wheel', preventDefault);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      onWheel={handleWheel}
      className={`absolute top-1/2 -translate-y-1/2 h-[800px] w-[500px] flex items-center justify-center z-10 ${side === 'left' ? 'left-4' : 'right-4'}`}
    >
      <div className="relative w-full h-full">
        {items.map((item, index) => {
          // Calculate circular offset
          let offset = index - activeIndex;
          if (offset > items.length / 2) offset -= items.length;
          if (offset < -items.length / 2) offset += items.length;
          
          // Configuration for the arc
          const ySpacing = 320; // Increased spacing for bigger cards
          const xCurve = 140;    // Increased curve
          const rotation = 15;  
          const scaleStep = 0.1; 
          const opacityStep = 0.2; // Less opacity fade to see more items

          // Calculate transforms
          // We limit the visible range to keep it clean (e.g., +/- 3 items)
          if (Math.abs(offset) > 3) return null;

          const translateY = offset * ySpacing;
          
          // If side is left, active item is right-most (closest to center screen)
          // Items move LEFT as they move away from center index
          // If side is right, active item is left-most (closest to center screen)
          // Items move RIGHT as they move away from center index
          
          let translateX = 0;
          let rotateZ = 0;

          if (side === 'left') {
             // Curve like (
             // Active item at x=0 (relative to right edge of container ideally, but here centered)
             // Let's say container is aligned. 
             // We want the curve to bow OUT towards the center of the screen.
             // So active item is closest to center.
             translateX = -Math.abs(offset) * xCurve;
             rotateZ = -offset * rotation;
          } else {
             // Curve like )
             translateX = Math.abs(offset) * xCurve;
             rotateZ = offset * rotation;
          }

          const scale = 1 - Math.abs(offset) * scaleStep;
          const opacity = 1 - Math.abs(offset) * opacityStep;
          const zIndex = 100 - Math.abs(offset);

          return (
            <div
              key={item.id}
              className="absolute top-1/2 left-1/2 w-80 h-[480px] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out cursor-pointer hover:border-red-500"
              style={{
                transform: `translate(-50%, -50%) translateY(${translateY}px) translateX(${translateX}px) rotate(${rotateZ}deg) scale(${scale})`,
                zIndex,
                opacity: Math.max(opacity, 0),
              }}
              onClick={() => setActiveIndex(index)}
            >
              <div className="h-3/5 w-full bg-gray-800 relative">
                <CardImage 
                  src={item.image} 
                  alt={item.title} 
                  fallbackSrc={fallbackImage}
                />
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {item.category}
                </div>
              </div>
              <div className="p-4 text-left">
                <h3 className="text-lg font-bold text-white truncate">{item.title}</h3>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-baseline space-x-2">
                    <span className="text-xl font-bold text-red-500">{item.price}</span>
                    {item.originalPrice && (
                      <span className="text-sm text-gray-500 line-through">{item.originalPrice}</span>
                    )}
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <svg 
                        key={i} 
                        className={`w-4 h-4 ${i < (item.rating || 0) ? 'text-yellow-400' : 'text-gray-600'}`} 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>

                <button className="mt-3 w-full bg-white text-black text-sm font-bold py-2 rounded hover:bg-gray-200 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ArcCarousel;
