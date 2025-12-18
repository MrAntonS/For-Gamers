import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductList from './components/ProductList'
import GameDeals from './components/GameDeals'
import HardwareDeals from './components/HardwareDeals'
import MinMaxTab from './components/MinMaxTab'
import SearchResults from './components/SearchResults'
import IntegrationTest from './components/IntegrationTest'
import ProductPage from './components/ProductPage'
import Checkout from './components/Checkout'
import { CartProvider } from './contexts/CartContext'
import { AuthProvider } from './contexts/AuthContext'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
            <Navbar />
            <div className="flex-1 overflow-auto">
              <Routes>
                <Route path="/" element={<Hero />} />
                <Route path="/deals" element={<ProductList />} />
                <Route path="/deals/games" element={<GameDeals />} />
                <Route path="/deals/hardware" element={<HardwareDeals />} />
                <Route path="/product/:id" element={<ProductPage />} />
                <Route path="/minmax" element={<MinMaxTab />} />
                <Route path="/search" element={<SearchResults />} />
                <Route path="/integration" element={<IntegrationTest />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </div>
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
