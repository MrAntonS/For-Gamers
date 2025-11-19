import Navbar from './components/Navbar'
import Hero from './components/Hero'
import './App.css'

function App() {
  return (
    <div className="h-screen overflow-hidden bg-black text-white flex flex-col">
      <Navbar />
      <div className="flex-1 overflow-hidden">
        <Hero />
      </div>
    </div>
  )
}

export default App
