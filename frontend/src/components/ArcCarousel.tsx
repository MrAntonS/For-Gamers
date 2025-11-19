import React, { useState, useEffect, useRef } from 'react';
import ProductCard from './ProductCard';

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

const ArcCarousel: React.FC<ArcCarouselProps> = ({ items, side, fallbackImage }) => {
  const [activeIndex, setActiveIndex] = useState(Math.floor(items.length / 2));
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Auto-scroll effect
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [items.length, activeIndex]);

  const handleWheel = (e: React.WheelEvent) => {
    if (isScrollingRef.current) return;

    isScrollingRef.current = true;
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 500);

    if (e.deltaY > 0) {
      setActiveIndex((prev) => (prev + 1) % items.length);
    } else {
      setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
    }
  };

  const handleCardClick = (index: number) => {
    if (isScrollingRef.current) return;

    let diff = index - activeIndex;
    // Normalize diff for shortest path
    if (diff > items.length / 2) diff -= items.length;
    if (diff < -items.length / 2) diff += items.length;

    if (diff === 0) return;

    const direction = diff > 0 ? 1 : -1;
    const steps = Math.abs(diff);
    
    isScrollingRef.current = true;
    let stepCount = 0;

    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        let next = prev + direction;
        if (next < 0) next += items.length;
        if (next >= items.length) next -= items.length;
        return next;
      });
      
      stepCount++;
      if (stepCount === steps) {
        clearInterval(interval);
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 500);
      }
    }, 150);
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
      className={`absolute top-1/2 -translate-y-1/2 h-[400px] 2xl:h-[40vh] w-[250px] 2xl:w-[17.5vw] hidden lg:flex items-center justify-center z-10 ${side === 'left' ? 'left-4' : 'right-4'}`}
    >
      <div className="relative w-full h-full">
        {items.map((item, index) => {
          // Calculate circular offset
          let offset = index - activeIndex;
          if (offset > items.length / 2) offset -= items.length;
          if (offset < -items.length / 2) offset += items.length;
          
          // Configuration for the arc
          const ySpacing = 66.6; // Percentage of card height
          const xCurve = 43.75;    // Percentage of card width
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
            <ProductCard
              key={item.id}
              id={item.id}
              title={item.title}
              price={item.price}
              originalPrice={item.originalPrice}
              image={item.image}
              category={item.category}
              rating={item.rating}
              fallbackImage={fallbackImage}
              className="absolute top-1/2 left-1/2 w-40 2xl:w-[11vw] aspect-2/3 h-auto"
              style={{
                transform: `translate(-50%, -50%) translateY(${translateY}%) translateX(${translateX}%) rotate(${rotateZ}deg) scale(${scale})`,
                zIndex,
                opacity: Math.max(opacity, 0),
              }}
              onClick={() => handleCardClick(index)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ArcCarousel;
