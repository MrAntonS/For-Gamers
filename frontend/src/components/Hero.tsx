import ArcCarousel, { type DealItem } from './ArcCarousel';

const gameDeals: DealItem[] = [
  { id: 1, title: "Cyberpunk 2077", price: "$29.99", originalPrice: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
  { id: 2, title: "Elden Ring", price: "$39.99", originalPrice: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 3, title: "God of War", price: "$49.99", category: "Action", image: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80", rating: 4.8 },
  { id: 4, title: "Starfield", price: "$69.99", category: "RPG", image: "https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&w=400&q=80", rating: 4.0 },
  { id: 5, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 11, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 12, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 13, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 14, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 15, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },
  { id: 16, title: "Baldur's Gate 3", price: "$59.99", category: "RPG", image: "https://images.unsplash.com/photo-1612287230217-969e43c445bf?auto=format&fit=crop&w=400&q=80", rating: 5 },

];

const hardwareDeals: DealItem[] = [
  { id: 6, title: "RTX 4090", price: "$1599.99", category: "GPU", image: "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=400&q=80", rating: 4.9 },
  { id: 7, title: "Ryzen 9 7950X", price: "$599.99", originalPrice: "$699.99", category: "CPU", image: "https://images.unsplash.com/photo-1555616635-640960031520?auto=format&fit=crop&w=400&q=80", rating: 4.7 },
  { id: 8, title: "Logitech G Pro", price: "$99.99", category: "Mouse", image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80", rating: 4.6 },
  { id: 9, title: "Corsair K70", price: "$129.99", category: "Keyboard", image: "https://images.unsplash.com/photo-1587829741301-dc798b91a603?auto=format&fit=crop&w=400&q=80", rating: 4.5 },
  { id: 10, title: "Samsung Odyssey", price: "$999.99", category: "Monitor", image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=400&q=80", rating: 4.4 },
];

const Hero = () => {
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
