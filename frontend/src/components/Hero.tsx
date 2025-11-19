import { useState, useEffect } from 'react';
import ArcCarousel, { type DealItem } from './ArcCarousel';

const Hero = () => {
  const [gameDeals, setGameDeals] = useState<DealItem[]>([]);
  const [hardwareDeals, setHardwareDeals] = useState<DealItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/deals');
        if (response.ok) {
          const data = await response.json();
          setGameDeals(data.game_deals);
          setHardwareDeals(data.hardware_deals);
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

  if (loading) {
    return <div className="h-full bg-black flex items-center justify-center text-white">Loading deals...</div>;
  }

  return (
    <div className="relative bg-black overflow-hidden h-full flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover opacity-50"
          src="/hero-bg.jpg"
          alt="Gaming Setup"
        />
        {/* Overlay to darken the image for text readability */}
        <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/40 to-black/80" aria-hidden="true" />
      </div>

      {/* Left Carousel - Game Deals */}
      <ArcCarousel items={gameDeals} side="left" fallbackImage="/game-placeholder.png" />

      {/* Right Carousel - Hardware Deals */}
      <ArcCarousel items={hardwareDeals} side="right" fallbackImage="/hardware-placeholder.png" />

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pointer-events-none">
        <div className="text-center pointer-events-auto">
          <h1 className="text-4xl tracking-tight font-extrabold text-white sm:text-5xl md:text-6xl drop-shadow-lg">
            <span className="block">Level Up Your</span>
            <span className="block text-red-600">Gaming Experience</span>
          </h1>
          <p className="mt-6 max-w-md mx-auto text-lg text-gray-200 sm:text-xl md:max-w-3xl drop-shadow-md">
            The ultimate destination for hardware, games, and accessories.
            Build your dream setup today.
          </p>
          <div className="mt-10 max-w-sm mx-auto sm:max-w-none sm:flex sm:justify-center">
            <div className="space-y-4 sm:space-y-0 sm:mx-auto sm:inline-grid sm:grid-cols-2 sm:gap-5">
              <a
                href="#"
                className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-black bg-white hover:bg-gray-200 sm:px-8"
              >
                Shop Now
              </a>
              <a
                href="#"
                className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 sm:px-8"
              >
                View Deals
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
