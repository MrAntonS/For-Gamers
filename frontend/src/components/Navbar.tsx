import { Link } from 'react-router-dom';

const Navbar = () => {
  const navItems = [
    { name: "Min-Max build", href: "/minmax" },
    { name: "Game Deals", href: "/deals/games" },
    { name: "Hardware Deals", href: "/deals/hardware" },
    { name: "Best Accessories", href: "#" },
  ];

  return (
    <nav className="bg-black text-white border-b border-red-600">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left Section: Logo & Nav */}
          <div className="flex items-center">
            <Link to="/" className="shrink-0 font-bold text-xl tracking-wider text-red-600 mr-8">
              FOR GAMERS
            </Link>
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Section: Search & Login */}
          <div className="flex items-center justify-end flex-1">
            {/* Search Bar */}
            <div className="max-w-md w-full mx-4 hidden md:block">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-700 rounded-md leading-5 bg-gray-900 text-gray-300 placeholder-gray-400 focus:outline-none focus:bg-black focus:border-red-600 focus:ring-1 focus:ring-red-600 sm:text-sm"
                  placeholder="Search for games or hardware"
                />
              </div>
            </div>

            {/* Login/Signup */}
            <div className="hidden md:flex items-center">
              <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200">
                Login / Sign Up
              </button>
            </div>
          </div>

          {/* Mobile Menu Button Placeholder (can be implemented later) */}
          <div className="-mr-2 flex md:hidden">
            <button className="bg-black inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:text-white hover:bg-red-600 focus:outline-none border border-red-600">
              <span className="sr-only">Open main menu</span>
              {/* Hamburger Icon */}
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
