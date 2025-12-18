import React, { useMemo, useState } from 'react';
import { useCart } from '../contexts/CartContext';
import { FaSteam, FaShoppingCart, FaArrowLeft, FaExternalLinkAlt } from 'react-icons/fa';
import { SiEbay } from 'react-icons/si';
import { useNavigate } from 'react-router-dom';

const Checkout: React.FC = () => {
    const { cartItems, cartTotal } = useCart();
    const navigate = useNavigate();
    const [showSteamLinks, setShowSteamLinks] = useState(false);
    const [showEbayLinks, setShowEbayLinks] = useState(false);

    // Separate items by category
    const { gameItems, hardwareItems } = useMemo(() => {
        const games = cartItems.filter(item => item.category === 'Game');
        const hardware = cartItems.filter(item => item.category === 'Hardware');
        return { gameItems: games, hardwareItems: hardware };
    }, [cartItems]);

    // Calculate totals
    const parsePrice = (priceStr: string): number => {
        if (!priceStr || typeof priceStr !== 'string') return 0;
        const cleaned = priceStr.replace(/[$€£,]/g, '').trim();
        const parsed = parseFloat(cleaned);
        return isNaN(parsed) ? 0 : parsed;
    };

    const gameTotal = gameItems.reduce((total, item) => {
        return total + (parsePrice(item.price) * item.quantity);
    }, 0);

    const hardwareTotal = hardwareItems.reduce((total, item) => {
        return total + (parsePrice(item.price) * item.quantity);
    }, 0);

    // Generate Steam cart link
    // Steam cart URL format: https://store.steampowered.com/cart/
    // To add items, we need to redirect to each game's page
    // Steam doesn't have a direct "add multiple to cart" API, so we'll create a list
    const generateSteamLinks = () => {
        return gameItems.map(item => {
            // Use steam_id if available, otherwise fall back to id
            const steamId = item.steam_id || item.id;
            return {
                name: item.name,
                url: `https://store.steampowered.com/app/${steamId}`,
                quantity: item.quantity
            };
        });
    };

    // Generate eBay links
    // eBay item URL format: https://www.ebay.com/itm/{item_id}
    // Note: eBay item IDs can be in format: v1|{itemId}|0
    const generateEbayLinks = () => {
        return hardwareItems.map(item => {
            // Use ebayItemId if available, otherwise fall back to id
            const ebayId = item.ebayItemId || item.id.toString();

            // Parse eBay item ID format (v1|{itemId}|0)
            const parts = ebayId.split('|');
            const actualItemId = parts && parts.length >= 2 ? parts[1] : ebayId;

            return {
                name: item.name,
                url: `https://www.ebay.com/itm/${actualItemId}`,
                quantity: item.quantity
            };
        });
    };

    const steamLinks = generateSteamLinks();
    const ebayLinks = generateEbayLinks();

    // Open all Steam links
    const openSteamLinks = () => {
        // Open all links at once - browsers allow multiple popups from a single user action
        steamLinks.forEach((link) => {
            window.open(link.url, '_blank', 'noopener,noreferrer');
        });
    };

    // Open all eBay links
    const openEbayLinks = () => {
        // Open all links at once - browsers allow multiple popups from a single user action
        ebayLinks.forEach((link) => {
            window.open(link.url, '_blank', 'noopener,noreferrer');
        });
    };

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
                <div className="container mx-auto px-4 py-8">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                    >
                        <FaArrowLeft /> Back to Home
                    </button>

                    <div className="flex flex-col items-center justify-center min-h-[60vh]">
                        <FaShoppingCart className="text-6xl text-gray-600 mb-4" />
                        <h2 className="text-3xl font-bold mb-2">Your cart is empty</h2>
                        <p className="text-gray-400 mb-6">Add some items to checkout!</p>
                        <button
                            onClick={() => navigate('/deals')}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                        >
                            Browse Deals
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
            <div className="container mx-auto px-4 py-8">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                >
                    <FaArrowLeft /> Back to Home
                </button>

                <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                    Checkout
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Steam Games Section */}
                    {gameItems.length > 0 && (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <FaSteam className="text-4xl text-blue-400" />
                                <div>
                                    <h2 className="text-2xl font-bold">Steam Games</h2>
                                    <p className="text-gray-400 text-sm">{gameItems.length} item(s)</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                                {gameItems.map((item) => (
                                    <div key={item.id} className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{item.name}</h3>
                                            <p className="text-sm text-gray-400">Qty: {item.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-500">{item.price}</p>
                                            {item.originalPrice && (
                                                <p className="text-xs text-gray-500 line-through">{item.originalPrice}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-700 pt-4 mb-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-gray-400">Subtotal:</span>
                                    <span className="font-bold">${gameTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={openSteamLinks}
                                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <FaSteam className="text-xl" />
                                Open Steam Links ({steamLinks.length})
                            </button>

                            <p className="text-xs text-gray-500 mt-3 text-center">
                                This will open each game's Steam page in a new tab. Add them to your cart manually.
                            </p>

                            {/* Manual link access */}
                            <button
                                onClick={() => setShowSteamLinks(!showSteamLinks)}
                                className="w-full mt-2 text-xs text-gray-400 hover:text-white transition-colors underline"
                            >
                                {showSteamLinks ? 'Hide' : 'Show'} individual links
                            </button>

                            {showSteamLinks && (
                                <div className="mt-3 bg-gray-900/50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                                    {steamLinks.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                                        >
                                            <FaExternalLinkAlt className="text-xs" />
                                            <span className="truncate">{link.name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* eBay Hardware Section */}
                    {hardwareItems.length > 0 && (
                        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all">
                            <div className="flex items-center gap-3 mb-6">
                                <SiEbay className="text-4xl text-yellow-400" />
                                <div>
                                    <h2 className="text-2xl font-bold">Hardware Items</h2>
                                    <p className="text-gray-400 text-sm">{hardwareItems.length} item(s)</p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                                {hardwareItems.map((item) => (
                                    <div key={item.id} className="bg-gray-900/50 rounded-lg p-3 flex items-center gap-3">
                                        <img
                                            src={item.image}
                                            alt={item.name}
                                            className="w-16 h-16 object-cover rounded"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold truncate">{item.name}</h3>
                                            <p className="text-sm text-gray-400">
                                                {item.brand && `${item.brand} • `}Qty: {item.quantity}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-500">{item.price}</p>
                                            {item.originalPrice && (
                                                <p className="text-xs text-gray-500 line-through">{item.originalPrice}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-700 pt-4 mb-4">
                                <div className="flex justify-between items-center text-lg">
                                    <span className="text-gray-400">Subtotal:</span>
                                    <span className="font-bold">${hardwareTotal.toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                onClick={openEbayLinks}
                                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black font-bold py-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <SiEbay className="text-xl" />
                                Open eBay Links ({ebayLinks.length})
                            </button>

                            <p className="text-xs text-gray-500 mt-3 text-center">
                                This will open each item's eBay listing in a new tab. Add them to your cart manually.
                            </p>

                            {/* Manual link access */}
                            <button
                                onClick={() => setShowEbayLinks(!showEbayLinks)}
                                className="w-full mt-2 text-xs text-gray-400 hover:text-white transition-colors underline"
                            >
                                {showEbayLinks ? 'Hide' : 'Show'} individual links
                            </button>

                            {showEbayLinks && (
                                <div className="mt-3 bg-gray-900/50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                                    {ebayLinks.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 transition-colors"
                                        >
                                            <FaExternalLinkAlt className="text-xs" />
                                            <span className="truncate">{link.name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Total Summary */}
                <div className="mt-8 bg-gradient-to-r from-red-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-6 border border-red-500/30">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-2xl font-bold">Grand Total</h3>
                            <p className="text-gray-400 text-sm">
                                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} total items
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-bold bg-gradient-to-r from-red-500 to-purple-600 bg-clip-text text-transparent">
                                ${cartTotal.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Instructions */}
                <div className="mt-8 bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
                    <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                        <span className="text-blue-400">ℹ️</span> How to Complete Your Purchase
                    </h3>
                    <ol className="list-decimal list-inside space-y-2 text-gray-300">
                        <li>Click the "Open Steam Links" or "Open eBay Links" buttons above</li>
                        <li>Each item will open in a new browser tab</li>
                        <li>Add each item to your cart on the respective platform (Steam or eBay)</li>
                        <li>Complete your purchase on Steam and/or eBay separately</li>
                    </ol>
                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded">
                        <p className="text-sm text-yellow-200 font-semibold mb-1">⚠️ Popup Blocker Notice</p>
                        <p className="text-xs text-gray-300">
                            If your browser blocks the popups, click "Show individual links" below each button to manually open each product page.
                        </p>
                    </div>
                    <p className="mt-4 text-sm text-gray-400">
                        <strong>Note:</strong> Due to platform restrictions, we cannot automatically add items to Steam or eBay carts.
                        You'll need to manually add each item, but we've made it easy by opening all the links for you!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Checkout;
