import React from 'react';
import { useCart } from '../contexts/CartContext';
import { FaTrash, FaTimes } from 'react-icons/fa';

interface CartProps {
  isOpen: boolean;
  onClose: () => void;
}

const Cart: React.FC<CartProps> = ({ isOpen, onClose }) => {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, cartCount } = useCart();

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      
      {/* Cart Panel */}
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-gray-900 shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Shopping Cart {cartCount > 0 && `(${cartCount})`}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <svg className="w-20 h-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg">Your cart is empty</p>
              <p className="text-sm mt-2">Add some items to get started!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                  <div className="flex gap-3">
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm truncate">{item.name}</h3>
                      <p className="text-gray-400 text-xs mt-1">{item.category}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-red-500 font-bold">{item.price}</span>
                        {item.originalPrice && (
                          <span className="text-gray-500 text-xs line-through">{item.originalPrice}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-white font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-7 h-7 rounded bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                      title="Remove from cart"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="border-t border-gray-700 p-4 space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="text-gray-400">Total:</span>
              <span className="text-white font-bold">${cartTotal.toFixed(2)}</span>
            </div>
            
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded transition-colors">
              Checkout
            </button>
            
            <button 
              onClick={clearCart}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 rounded transition-colors text-sm"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
