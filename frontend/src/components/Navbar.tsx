import React from 'react';

const Navbar = () => {
  const navItems = [
    { name: "Min-Max build", href: "#" },
    { name: "Game Deals", href: "#" },
    { name: "Hardware deals", href: "#" },
    { name: "Best accessories", href: "#" },
  ];

  return (
    <nav className="bg-black text-white border-b border-red-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 font-bold text-xl tracking-wider text-red-600">
            FOR GAMERS
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="hover:bg-red-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  {item.name}
                </a>
              ))}
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
