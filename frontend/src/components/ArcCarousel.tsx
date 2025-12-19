import React, { useState, useEffect, useRef, useCallback } from 'react';
import ProductCard from './ProductCard';

export interface DealItem {
  id: number;
  title: string;
  price: string;
  originalPrice?: string;
  image: string;
  category: string;
  rating?: number;
  description?: string;
  steam_id?: number;
}

interface ArcCarouselProps {
  items: DealItem[];
  side: 'left' | 'right';
  fallbackImage?: string;
}

const ArcCarousel: React.FC<ArcCarouselProps> = ({ items, side, fallbackImage }) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [dimensions, setDimensions] = useState({
    radiusX: 250,
    radiusY: 500,
    cardWidth: 240,
    cardHeight: 350
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number>(0);
  const lastScrollTime = useRef<number>(0);

  // Configuration
  const VISIBLE_ITEMS = 6;

  const totalItems = items.length;

  // Responsive dimensions
  useEffect(() => {
    const handleResize = () => {
      const h = window.innerHeight;
      // Scale down for smaller screens
      // Base height reference: 900px
      const scaleFactor = Math.min(1, Math.max(0.6, h / 900));

      setDimensions({
        radiusX: 250 * scaleFactor,
        radiusY: h * 0.4, // Dynamic Y radius based on viewport height
        cardWidth: 240 * scaleFactor,
        cardHeight: 350 * scaleFactor
      });
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (totalItems === 0 || isHovered) return;

    const animate = (time: number) => {
      if (time - lastScrollTime.current > 16) { // Cap at ~60fps
        setScrollProgress(prev => {
          const next = prev + 0.002; // Slow auto-scroll
          return next % totalItems;
        });
        lastScrollTime.current = time;
      }
      autoScrollRef.current = requestAnimationFrame(animate);
    };
    autoScrollRef.current = requestAnimationFrame(animate);

    return () => {
      if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    };
  }, [totalItems, isHovered]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    // e.preventDefault(); // React synthetic events can't always prevent default passive listeners

    const delta = e.deltaY * 0.001; // Sensitivity
    setScrollProgress(prev => {
      let next = prev + delta;
      // Normalize
      if (next < 0) next += totalItems;
      if (next >= totalItems) next -= totalItems;
      return next;
    });
  }, [totalItems]);

  // Prevent default scroll on the container to avoid scrolling the page
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const preventDefault = (e: WheelEvent) => e.preventDefault();
    container.addEventListener('wheel', preventDefault, { passive: false });
    return () => container.removeEventListener('wheel', preventDefault);
  }, []);

  const getItemStyle = (index: number) => {
    if (totalItems === 0) return { display: 'none' };

    let offset = index - scrollProgress;

    // Shortest path wrapping
    while (offset < -totalItems / 2) offset += totalItems;
    while (offset > totalItems / 2) offset -= totalItems;

    // Visibility check
    if (Math.abs(offset) > VISIBLE_ITEMS / 2 + 1) {
      return { display: 'none' };
    }

    // Map offset to angle. 
    // We want the visible items to span a certain angle range.
    // Let's say we want to span 120 degrees (PI * 2/3).
    const angleSpread = Math.PI * 0.6;
    const angle = offset * (angleSpread / (VISIBLE_ITEMS / 2));

    // Calculate position
    const y = Math.sin(angle) * dimensions.radiusY;
    const xOffset = Math.cos(angle) * dimensions.radiusX;

    let x, rotate;

    if (side === 'left') {
      // Arc bows right )
      // Center is to the left.
      // At angle 0 (center), x should be max (closest to screen center).
      // x = -RADIUS_X + xOffset.
      // We want to shift it so it's visible.
      x = -dimensions.radiusX + xOffset + 20;
      rotate = angle * (180 / Math.PI) * 0.3;
    } else {
      // Arc bows left (
      // Center is to the right.
      x = dimensions.radiusX - xOffset - 20;
      rotate = -angle * (180 / Math.PI) * 0.3;
    }

    const scale = Math.max(0.6, Math.cos(angle));
    const opacity = Math.max(0, Math.cos(angle));
    const zIndex = Math.round(scale * 100);

    return {
      transform: `translate3d(${x}px, ${y}px, 0) translateY(-50%) scale(${scale}) rotate(${rotate}deg)`,
      opacity,
      zIndex,
      position: 'absolute' as const,
      top: '50%',
      left: side === 'left' ? '0' : 'auto',
      right: side === 'right' ? '0' : 'auto',
      // Center the item itself
      marginLeft: side === 'left' ? '50px' : '0',
      marginRight: side === 'right' ? '50px' : '0',
    };
  };

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`absolute top-0 bottom-0 w-[350px] hidden lg:flex items-center justify-center z-10 ${side === 'left' ? 'left-0' : 'right-0'}`}
    >
      <div className="relative w-full h-full">
        {items.map((item, index) => (
          <div key={item.id} style={getItemStyle(index)} className="will-change-transform">
            <ProductCard
              {...item}
              width={`${dimensions.cardWidth}px`}
              height={`${dimensions.cardHeight}px`}
              className="shadow-2xl"
              enableHoverReveal={true}
              fallbackImage={fallbackImage}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArcCarousel;
