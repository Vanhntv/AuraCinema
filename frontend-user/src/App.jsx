import Header from './components/Header'
import HeroSlider from './components/HeroSlider'
import Footer from './components/Footer'
import NowShowingMovies from './components/NowShowingMovies'

function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_78%_0%,rgba(255,98,111,0.18),transparent_28%),#0f141c] text-slate-50">
      <Header />
      <HeroSlider />
      <NowShowingMovies />
      <Footer />
    </main>
  )
}

export default App
