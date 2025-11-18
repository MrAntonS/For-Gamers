import React, { useState, useEffect, useRef } from 'react';

export interface DealItem {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: string;
}

interface ArcCarouselProps {
  items: DealItem[];
  side: 'left' | 'right';
}

const ArcCarousel: React.FC<ArcCarouselProps> = ({ items, side }) => {
  const [activeIndex, setActiveIndex] = useState(Math.floor(items.length / 2));
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      setActiveIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else {
      setActiveIndex((prev) => Math.max(prev - 1, 0));
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
      className={`absolute top-1/2 -translate-y-1/2 h-[600px] w-[300px] flex items-center justify-center z-10 ${side === 'left' ? 'left-4' : 'right-4'}`}
    >
      <div className="relative w-full h-full">
        {items.map((item, index) => {
          const offset = index - activeIndex;
          
          // Configuration for the arc
          const ySpacing = 140; // Vertical distance between cards
          const xCurve = 60;    // How much it curves horizontally
          const rotation = 15;  // Rotation degree per step
          const scaleStep = 0.1; // Scale reduction per step
          const opacityStep = 0.3; // Opacity reduction per step

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
              className="absolute top-1/2 left-1/2 w-48 h-64 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-500 ease-out cursor-pointer hover:border-red-500"
              style={{
                transform: `translate(-50%, -50%) translateY(${translateY}px) translateX(${translateX}px) rotate(${rotateZ}deg) scale(${scale})`,
                zIndex,
                opacity: Math.max(opacity, 0),
              }}
              onClick={() => setActiveIndex(index)}
            >
              <div className="h-3/5 w-full bg-gray-800 relative">
                <img 
                  src={item.image} 
                  alt={item.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">
                  {item.category}
                </div>
              </div>
              <div className="p-3 text-left">
                <h3 className="text-sm font-bold text-white truncate">{item.title}</h3>
                <div className="flex items-baseline mt-1 space-x-2">
                  <span className="text-lg font-bold text-red-500">{item.price}</span>
                  {item.originalPrice && (
                    <span className="text-xs text-gray-500 line-through">{item.originalPrice}</span>
                  )}
                </div>
                <button className="mt-2 w-full bg-white text-black text-xs font-bold py-1 rounded hover:bg-gray-200 transition-colors">
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
