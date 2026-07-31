import Navbar from "../components/layout/Navbar";
import Hero from "../components/home/Hero";
import FeaturedProducts from "../components/home/FeaturedProducts";
import Features from "../components/home/Features";
import Footer from "../components/layout/Footer";

function Home() {
  return (
    <div dir="rtl" className="min-h-screen bg-white text-zinc-950">
      <Navbar />
      <main>
        <Hero />
        <FeaturedProducts />
        <Features />
      </main>
      <Footer />
    </div>
  );
}

export default Home;
