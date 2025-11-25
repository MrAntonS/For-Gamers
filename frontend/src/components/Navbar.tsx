import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUser, FaSignOutAlt } from 'react-icons/fa';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import Cart from './Cart';
import AuthModal from './AuthModal';

const Navbar = () => {
  const { cartCount } = useCart();
  const { user, isAuthenticated, logout } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems = [
    { name: "Min-Max build", href: "/minmax" },
    { name: "Game Deals", href: "/deals/games" },
    { name: "Hardware Deals", href: "/deals/hardware" },
    { name: "Best Accessories", href: "#" },
  ];

  return (
    <>
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

            {/* Login/Signup & Cart */}
            <div className="hidden md:flex items-center gap-4">
              {/* Cart Icon */}
              <button 
                onClick={() => setIsCartOpen(true)}
                className="relative text-white hover:text-red-500 transition-colors"
              >
                <FaShoppingCart size={24} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>

              {isAuthenticated && user ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    <FaUser />
                    <span>{user.username}</span>
                  </button>
                  
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
                      <div className="px-4 py-2 border-b border-gray-700">
                        <p className="text-sm text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-red-500 transition-colors"
                      >
                        <FaSignOutAlt />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setIsAuthModalOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Login / Sign Up
                </button>
              )}
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
    
    {/* Cart Sidebar */}
    <Cart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    
    {/* Auth Modal */}
    <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
  </>
  );
};

export default Navbar;
