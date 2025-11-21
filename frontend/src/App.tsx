import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import ProductList from './components/ProductList'
import MinMaxTab from './components/MinMaxTab'
import './App.css'

function App() {
  return (
    <Router>
      <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
        <Navbar />
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Hero />} />
            <Route path="/deals" element={<ProductList />} />
            <Route path="/minmax" element={<MinMaxTab />} />
          </Routes>
        </div>
      </div>
    </Router>
  )
}

export default App
