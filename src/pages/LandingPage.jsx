import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { 
  Sparkles, Search, Package, Hammer, Home, HardHat, 
  Store, Wrench, Bell, MapPin, Bot, ShieldCheck, 
  Clock, Briefcase, Tag, Menu, X, ChevronDown,
  Star, Linkedin, Instagram, Twitter, Check, Moon, Sun
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// --- CSS for Animations ---
const AnimationStyles = () => (
  <style dangerouslySetInnerHTML={{ __html: `
    html { scroll-behavior: smooth; }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50%       { transform: translateY(-10px); }
    }
    .float-card { animation: float 3.5s ease-in-out infinite; }
    
    @keyframes bellBlink {
      0%,100% { opacity:1; } 50% { opacity:0.3; }
    }
    .bell-blink { animation: bellBlink 2s infinite; }
  ` }} />
);

// --- Navbar Component ---
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'Roles', href: '#roles' },
    { name: 'Features', href: '#features' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <nav className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 md:px-12 lg:px-24 py-4 flex items-center justify-between border-b-[0.5px]",
      scrolled ? "shadow-[0_2px_12px_rgba(0,0,0,0.08)] py-3" : ""
    )} style={{ 
      backgroundColor: scrolled ? 'var(--bg-primary)' : 'transparent',
      borderColor: 'var(--border)'
    }}>
      {/* Left: Logo */}
      <div className="flex items-center gap-2">
        <div className="text-2xl font-black tracking-tight flex items-center gap-1">
          <span style={{ color: 'var(--navy)' }}>Brick</span>
          <span style={{ color: 'var(--accent)' }}>ly</span>
          <HardHat size={18} style={{ color: 'var(--accent)' }} className="ml-1" />
        </div>
      </div>

      {/* Center: Desktop Links */}
      <div className="hidden md:flex items-center gap-8">
        {navLinks.map((link) => (
          <a 
            key={link.name} 
            href={link.href} 
            className="text-[14px] text-[var(--text-secondary)] font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            {link.name}
          </a>
        ))}
      </div>

      {/* Right: Buttons */}
      <div className="hidden md:flex items-center gap-4">
        <ThemeToggle />
        <Link to="/login" className="px-6 py-2 border-2 text-sm font-bold rounded-lg transition-all" style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}>
          Login
        </Link>
        <Link to="/register" className="px-6 py-2 bg-[#F97316] text-white font-bold rounded-lg hover:bg-orange-600 shadow-lg shadow-orange-100 transition-all text-sm">
          Get Started
        </Link>
      </div>

      {/* Mobile Menu Icon */}
      <button style={{ color: 'var(--navy)' }} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
        {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 border-b shadow-xl p-6 flex flex-col gap-4 md:hidden rounded-b-xl"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
          >
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-[var(--text-secondary)] font-medium text-lg border-b border-border pb-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <div className="flex flex-col gap-3 mt-2">
              <Link to="/login" className="px-6 py-3 border-2 font-bold rounded-lg text-center" style={{ borderColor: 'var(--navy)', color: 'var(--navy)' }}>
                Login
              </Link>
              <Link to="/register" className="px-6 py-3 bg-[#F97316] text-white font-bold rounded-lg text-center shadow-lg hover:bg-orange-600 transition-all">
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- Hero Component ---
const Hero = () => {
  const rolePills = [
    { text: "✦ For Customers", bg: "#EFF6FF", color: "#1D4ED8" },
    { text: "✦ For Contractors", bg: "#FFF7ED", color: "#C2410C" },
    { text: "✦ For Material Dealers", bg: "#F0FDF4", color: "#15803D" },
    { text: "✦ For Professionals", bg: "#F5F3FF", color: "#6D28D9" },
  ];
  const [currentPillIndex, setCurrentPillIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPillIndex((prev) => (prev + 1) % rolePills.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const heroImages = [
    {
      url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80',
      caption: 'Front View',
    },
    {
      url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80',
      caption: 'Side View',
    },
    {
      url: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=80',
      caption: 'Interior',
    },
    {
      url: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=400&q=80',
      caption: 'Night View',
    },
  ];

  return (
    <section id="home" className="min-h-screen pt-32 pb-20 px-6 md:px-12 lg:px-24 flex flex-col lg:flex-row items-center gap-16 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Left Column */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="flex-1 space-y-8 z-10"
      >
        <div className="space-y-4">
          <h1 className="text-[32px] md:text-[52px] font-[800] text-[var(--text-primary)] leading-[1.15]">
            Build Smarter. <br />
            Connect Faster.
          </h1>
          <p className="text-[18px] text-[var(--text-secondary)] leading-[1.7] max-w-[480px]">
            India's first AI-powered construction marketplace. Visualize your dream project, find trusted contractors, source materials, and hire skilled professionals — all in one place.
          </p>
        </div>

        {/* Animated Role Pills */}
        <div className="relative h-10 mt-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={rolePills[currentPillIndex].text}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              style={{ background: rolePills[currentPillIndex].bg, color: rolePills[currentPillIndex].color }}
              className="inline-flex px-4 py-1.5 rounded-full text-[13px] font-[500] whitespace-nowrap"
            >
              {rolePills[currentPillIndex].text}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4 pt-4">
          <Link to="/register" className="px-8 py-3 bg-[#F97316] text-white font-[600] rounded-xl text-[15px] flex items-center gap-2 hover:bg-orange-600 hover:scale-105 transition-all shadow-xl shadow-orange-100">
            Get Started Free →
          </Link>
          <a href="#how-it-works" className="px-8 py-3 border-[1.5px] border-[#1E3A5F] text-[#1E3A5F] font-[600] rounded-xl text-[15px] hover:bg-[#1E3A5F]/5 transition-all">
            See How It Works
          </a>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap gap-6 pt-6">
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
            <span>🔒</span> <span className="font-medium">Secure & Verified</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
            <span>✦</span> <span className="font-medium">AI-Powered Visuals</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
            <span>📍</span> <span className="font-medium">Location-Based Matching</span>
          </div>
        </div>
      </motion.div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col items-center">
        <div className="float-card rounded-[20px] p-5 max-w-[360px] w-full shadow-[0_20px_60px_rgba(0,0,0,0.12)] border-[0.5px]" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          {/* Card Header */}
          <div className="mb-3.5">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[#F97316]" />
              <span className="text-[13px] font-bold text-[var(--text-primary)]">AI Project Visualizer</span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">Your dream project, visualized before construction begins</p>
          </div>

          {/* Image Grid */}
          <div className="grid grid-cols-2 gap-2">
            {heroImages.map((img, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden group">
                <img src={img.url} alt={img.caption} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                  <span className="text-white text-[10px] font-bold text-center">{img.caption}</span>
                </div>
                <div className="absolute bottom-1 left-1.5">
                  <span className="text-[9px] font-bold text-white/90 bg-black/30 px-1.5 py-0.5 rounded backdrop-blur-sm">{img.caption}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Card Footer */}
          <div className="mt-3.5 pt-3.5 border-t border-[var(--border)]">
            <div className="flex items-center gap-2 mb-0.5 text-[12px] font-medium text-[var(--text-primary)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              Estimated cost: ₹45L – ₹72L
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">10 AI views generated in seconds</p>
          </div>
        </div>

        {/* Stat Chips */}
        <div className="flex flex-wrap gap-3 mt-6 justify-center">
          {["10,000+ Projects", "500+ Contractors", "100+ Dealers"].map((stat, i) => (
            <div key={i} className="px-3 py-1.5 rounded-full border shadow-sm text-[12px] font-medium" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              {stat}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- About Component ---
const About = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });

  return (
    <section id="about" ref={ref} className="py-20 px-6 overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto text-center space-y-6"
      >
        <div className="text-[12px] font-semibold text-[#F97316] tracking-[0.1em] uppercase">ABOUT THE PLATFORM</div>
        <h2 className="text-[38px] font-[800] text-[var(--text-primary)] leading-tight">One platform. Every person in construction.</h2>
        
        <div className="space-y-4 text-[16px] text-[var(--text-secondary)] max-w-2xl mx-auto leading-[1.75]">
          <p>
            Brickly brings together every stakeholder in the construction ecosystem. Whether you're a homeowner dreaming of a new house, a contractor managing multiple projects, a shop owner selling construction materials, or a skilled worker looking for the next job — Brickly is built for you.
          </p>
          <p>
            Powered by AI, Brickly lets customers visualize their project with realistic images before a single brick is laid. Contractors, dealers, and professionals connect through verified profiles, real-time notifications, and location-based matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 text-center">
          {[
            { icon: "🧠", title: "AI-Powered", desc: "Generate realistic project visuals using DALL·E before construction begins." },
            { icon: "👥", title: "4 User Roles", desc: "Built specifically for Customers, Contractors, Dealers, and Skilled Workers." },
            { icon: "📍", title: "Location-Smart", desc: "Find contractors and material dealers within kilometres of your site." },
          ].map((item, idx) => (
            <motion.div 
              key={idx}
              whileHover={{ y: -5 }}
              className="p-6 rounded-xl border shadow-sm hover:shadow-lg transition-all"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
            >
              <div className="text-3xl mb-4">{item.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">{item.title}</h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

// --- How It Works ---
const HowItWorks = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  const steps = [
    { title: "Visualize your project", desc: "Fill in your project details — type, size, style, budget. Our AI generates realistic exterior and interior images of your dream construction.", color: "#F97316" },
    { title: "Find the right contractor", desc: "Browse verified contractor profiles near your location. View their past projects, ratings, and reviews before reaching out.", color: "#1E3A5F" },
    { title: "Source your materials", desc: "Contractors discover trusted material dealers nearby, request quotes, compare prices, and track orders — all from their dashboard.", color: "#F97316" },
    { title: "Build with the right team", desc: "Post job vacancies or browse available skilled workers. Hire the right professionals for every trade.", color: "#1E3A5F" },
  ];

  return (
    <section id="how-it-works" ref={ref} className="py-20 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-2">
          <div className="text-[12px] font-semibold text-[#F97316] tracking-[0.1em] uppercase">HOW IT WORKS</div>
          <h2 className="text-[38px] font-extrabold text-[var(--text-primary)]">From vision to construction in 4 steps</h2>
        </div>

        <div className="relative">
          {/* Dashed Line (Desktop Only) */}
          <div className="hidden lg:block absolute top-6 left-8 right-8 h-0.5 border-t-2 border-dashed border-[var(--border)] -z-0" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className="flex flex-col items-center text-center group"
              >
                <div 
                  style={{ backgroundColor: step.color }} 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg mb-6 shadow-lg group-hover:scale-110 transition-transform"
                >
                  {idx + 1}
                </div>
                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary)]">{step.title}</h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed px-4">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// --- Role Cards ---
const Roles = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  const roleCards = [
    {
      role: "Customer",
      tagline: "Plan & visualize your dream project",
      icon: <Home size={32} />,
      color: "#F97316",
      border: "#F97316",
      features: [
        "Generate AI images of your project (exterior + interior)",
        "Estimate construction cost before hiring anyone",
        "Find and contact verified contractors near you",
        "Chat with an AI construction assistant anytime"
      ]
    },
    {
      role: "Contractor",
      tagline: "Manage projects, team, and materials",
      icon: <HardHat size={32} />,
      color: "#1E3A5F",
      border: "#1E3A5F",
      features: [
        "Accept projects and track contract milestones",
        "Post job vacancies and hire skilled workers",
        "Source materials from verified dealers nearby",
        "Receive real-time customer interest notifications"
      ]
    },
    {
      role: "Material Dealer",
      tagline: "Reach contractors. Sell more materials.",
      icon: <Store size={32} />,
      color: "#16A34A",
      border: "#16A34A",
      features: [
        "List your products with prices and stock status",
        "Receive and respond to quote requests from contractors",
        "Post limited-time deals with countdown timers",
        "Manage orders and update delivery status in real time"
      ]
    },
    {
      role: "CraftLink Professional",
      tagline: "Find work. Get hired. Build a career.",
      icon: <Wrench size={32} />,
      color: "#7C3AED",
      border: "#7C3AED",
      features: [
        "Browse job vacancies matching your trade",
        "Post your availability for contractors to find you",
        "Upload resume and certificates to your profile",
        "Get notified instantly when a contractor hires you"
      ]
    }
  ];

  return (
    <section id="roles" ref={ref} className="py-20 px-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto text-center mb-16 space-y-4">
        <div className="text-[12px] font-semibold text-[#F97316] tracking-[0.1em] uppercase">USER ROLES</div>
        <h2 className="text-[38px] font-extrabold text-[var(--text-primary)]">Brickly is built for everyone in construction</h2>
        <p className="text-[var(--text-secondary)] text-[16px] max-w-2xl mx-auto">Select your role and unlock a dashboard built exactly for your needs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {roleCards.map((card, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            transition={{ delay: idx * 0.08, duration: 0.5 }}
            whileHover={{ y: -6 }}
            className="p-8 rounded-2xl border-[0.5px] shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.09)] transition-all flex flex-col h-full"
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)', borderTop: `4px solid ${card.border}` }}
          >
            <div className="mb-6 flex flex-col items-start gap-4">
               <div style={{ color: card.color }}>{card.icon}</div>
               <div className="space-y-1">
                 <h3 className="text-2xl font-bold text-[var(--text-primary)]">{card.role}</h3>
                 <p className="text-[12px] font-bold text-[#F97316] uppercase tracking-wider">{card.tagline}</p>
               </div>
            </div>

            <ul className="space-y-4 mb-8 flex-grow">
              {card.features.map((feat, fIdx) => (
                <li key={fIdx} className="flex items-start gap-2.5 text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
                  <Check size={16} className="text-[#16A34A] font-bold mt-0.5 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <Link 
              to={`/register?role=${card.role.toLowerCase().replace(' ', '-')}`} 
              className="block w-full py-3 bg-[#F97316] text-white text-center rounded-lg font-bold text-[14px] hover:bg-orange-600 transition-all shadow-md shadow-orange-100"
            >
              Register as {card.role} →
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// --- Features Component ---
const Features = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  const features = [
    { title: 'AI Project Visualizer', desc: 'Describe your dream home and watch AI generate photorealistic exterior and interior views — before construction even starts.', url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=120&q=80' },
    { title: 'Real-time Notifications', desc: 'Socket.io-powered live alerts the moment a customer shows interest, a dealer responds to a quote, or a contractor hires you.', url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=120&q=80' },
    { title: 'Location-based Matching', desc: 'Find contractors within 5–10 km and material dealers within 15 km of your project site using geospatial search.', url: 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=120&q=80' },
    { title: 'AI Chatbot Assistant', desc: 'A GPT-powered assistant on every page, aware of your project type and budget to answer construction queries instantly.', url: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?w=120&q=80' },
    { title: 'Quote & Order System', desc: 'Contractors request quotes from dealer profiles. Dealers respond with prices. Orders tracked Pending to Delivered in real time.', url: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=120&q=80' },
    { title: 'Verified Profiles & GST Badge', desc: 'Material dealers with a GST number receive a green Verified Supplier badge. Contractor portfolios visible to all customers.', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=120&q=80' },
    { title: 'Contract Timeline Tracker', desc: 'Create milestones for every project. Track progress, mark completions, and detect overdue timelines automatically.', url: 'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=120&q=80' },
    { title: 'CraftLink Job Board', desc: 'A dedicated job board for skilled workers to apply to vacancies or post availability. Posts auto-delete on hire.', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=120&q=80' },
    { title: 'Deals & Offers Feed', desc: 'Material dealers post time-limited discounts. Contractors see live countdown timers and request quotes directly.', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=120&q=80' },
  ];

  return (
    <section id="features" ref={ref} className="py-20 px-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-2">
          <div className="text-[12px] font-semibold text-[#F97316] tracking-[0.1em] uppercase">PLATFORM FEATURES</div>
          <h2 className="text-[38px] font-extrabold text-[var(--text-primary)]">Everything you need. Built into one platform.</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className="p-8 rounded-2xl border border-[var(--border)] hover:bg-[var(--bg-secondary)] transition-all group flex flex-col items-center text-center shadow-sm hover:shadow-md"
              style={{ backgroundColor: 'var(--bg-primary)' }}
            >
              <div className="w-14 h-14 rounded-full overflow-hidden mb-6 shadow-inner ring-4 ring-[var(--bg-secondary)] group-hover:scale-110 transition-transform">
                <img src={f.url} alt={f.title} className="w-full h-full object-cover" loading="lazy" />
              </div>
              <h3 className="text-[18px] font-[800] text-[var(--text-primary)] mb-3 group-hover:text-[#F97316] transition-colors">{f.title}</h3>
              <p className="text-[13.5px] text-[var(--text-secondary)] leading-[1.7]">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- Stats Banner ---
const StatsBanner = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.5 });
  const stats = [
    { target: 10000, label: "Projects Visualized" },
    { target: 500, label: "Verified Contractors" },
    { target: 200, label: "Material Dealers" },
    { target: 5000, label: "Skilled Professionals" },
  ];

  const Counter = ({ target }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
      if (inView) {
        let start = 0;
        const duration = 1500;
        const increment = target / (duration / 16);
        const timer = setInterval(() => {
          start += increment;
          if (start >= target) {
            setCount(target);
            clearInterval(timer);
          } else {
            setCount(Math.floor(start));
          }
        }, 16);
        return () => clearInterval(timer);
      }
    }, [inView, target]);
    return <>{count.toLocaleString()}+</>;
  };

  return (
    <section ref={ref} className="py-16 px-6" style={{ backgroundColor: 'var(--sidebar-bg)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-12">
        {stats.map((s, i) => (
          <div key={i} className="text-center space-y-1">
            <div className="text-[40px] font-[800] text-[#F97316]">
              <Counter target={s.target} />
            </div>
            <div className="text-[14px] text-white/75 font-medium uppercase tracking-widest leading-tight">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Testimonials ---
const Testimonials = () => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.12 });
  const reviews = [
    { name: "Rajesh Kumar", role: "Homeowner, Chennai", init: "RK", bg: "#1E3A5F", quote: "I used the AI visualizer before starting my house construction. Seeing the exterior and interiors before a single brick was laid gave me so much confidence. Absolutely game-changing." },
    { name: "Arjun Sharma", role: "Contractor, Bangalore", init: "AS", bg: "#F97316", quote: "Brickly connects me directly with customers near my work area and lets me track every project's milestones. The material dealer quotes save me hours of calling around for prices." },
    { name: "Priya Devi", role: "Material Dealer, Hyderabad", init: "PD", bg: "#16A34A", quote: "Since joining Brickly, contractors find my shop through the platform. The quote inbox and order tracking panel makes managing bulk orders effortless. My sales went up 40%." }
  ];

  return (
    <section label="WHAT THEY SAY" ref={ref} className="py-20 px-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16 space-y-2">
          <div className="text-[12px] font-semibold text-[#F97316] tracking-[0.1em] uppercase">WHAT THEY SAY</div>
          <h2 className="text-[38px] font-extrabold text-[var(--text-primary)]">Trusted by builders across India</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((rev, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="p-8 rounded-2xl border shadow-sm flex flex-col h-full"
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}
            >
              <div className="flex gap-1 text-[#F97316] mb-6">
                {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
              </div>
              <p className="font-medium italic mb-8 flex-grow leading-[1.75] text-[14px]" style={{ color: 'var(--text-secondary)' }}>"{rev.quote}"</p>
              <div className="flex items-center gap-4">
                <div style={{ backgroundColor: rev.bg }} className="w-[44px] h-[44px] rounded-full flex items-center justify-center text-white font-[700] text-sm">{rev.init}</div>
                <div>
                  <div className="font-[600] text-[15px] text-[var(--text-primary)]">{rev.name}</div>
                  <div className="text-[12px] text-[var(--text-secondary)] font-medium">{rev.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- FAQ Component ---
const FAQ = () => {
  const [openIndex, setOpenIndex] = useState(0);
  const faqs = [
    { q: "Is Brickly free to use?", a: "Yes, registration and browsing is completely free for all roles. Contractors, customers, dealers, and professionals can create profiles and use core features at no cost." },
    { q: "How does the AI Project Visualizer work?", a: "You fill in your project details — type, floors, style, budget, and special requirements. Brickly sends this data to the DALL·E AI image generation API and returns realistic exterior and interior views within seconds." },
    { q: "How are contractors verified?", a: "Contractors build credibility through their portfolio of completed projects, customer star ratings, and public reviews. Material dealers receive an additional GST Verified badge when they provide their GST number." },
    { q: "How does location matching work?", a: "When you register, you drop a pin on an OpenStreetMap to save your exact location. Brickly uses MongoDB geospatial queries to match customers with contractors within 5–10 km and contractors with material dealers within 15 km." },
    { q: "What is a CraftLink Professional?", a: "A CraftLink Professional is a skilled construction worker — plumber, electrician, mason, carpenter, welder, and more — who uses Brickly to find job vacancies or post their own availability for contractors to hire them." },
    { q: "What happens after a contractor hires a worker?", a: "The moment a hire is made, the job post is permanently deleted from the platform so other applicants are not misled. The hired professional instantly receives an in-app notification and an email confirming their hire." },
  ];

  return (
    <section id="faq" className="py-20 px-6 max-w-[720px] mx-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="text-center mb-12">
        <h2 className="text-[32px] font-[800] text-[var(--text-primary)]">Frequently asked questions</h2>
      </div>
      <div className="space-y-0">
        {faqs.map((faq, idx) => (
          <div key={idx} className="border-b-[0.5px] border-[var(--border)] py-4 last:border-0">
            <button 
              className="w-full flex items-center justify-between text-left group"
              onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
            >
              <span className={cn("text-[15px] font-[500] transition-colors", openIndex === idx ? "text-[#F97316]" : "text-[var(--text-primary)] group-hover:text-[#F97316]")}>{faq.q}</span>
              <ChevronDown size={20} className={cn("text-[var(--text-secondary)] transition-transform duration-300", openIndex === idx && "rotate-180 text-[#F97316]")} />
            </button>
            <AnimatePresence>
              {openIndex === idx && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 text-[14px] text-[var(--text-secondary)] leading-[1.75]">{faq.a}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
};

// --- Footer ---
const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="pt-20 pb-10 px-6 md:px-12 lg:px-24 border-t" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
        <div className="space-y-6">
          <div className="text-2xl font-black flex items-center gap-1">
            <span style={{ color: 'var(--text-primary)' }}>Brick</span>
            <span className="text-[#F97316]">ly</span>
          </div>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>
            India's AI-powered construction marketplace connecting customers, contractors, material dealers, and professionals.
          </p>
          <div className="flex gap-4">
            {[Linkedin, Instagram, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="text-[var(--text-secondary)] hover:text-[#F97316] transition-colors" style={{ color: 'var(--text-secondary)' }}>
                <Icon size={20} />
              </a>
            ))}
          </div>
        </div>

        <div>
           <h4 className="text-[13px] font-[600] text-[#F97316] uppercase tracking-wider mb-6">Platform</h4>
           <ul className="space-y-4 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
             <li><a href="#how-it-works" className="hover:text-[#F97316] transition-colors">How It Works</a></li>
             <li><a href="#roles" className="hover:text-[#F97316] transition-colors">For Customers</a></li>
             <li><a href="#roles" className="hover:text-[#F97316] transition-colors">For Contractors</a></li>
             <li><a href="#roles" className="hover:text-[#F97316] transition-colors">For Dealers</a></li>
             <li><a href="#roles" className="hover:text-[#F97316] transition-colors">For Professionals</a></li>
           </ul>
        </div>

        <div>
           <h4 className="text-[13px] font-[600] text-[#F97316] uppercase tracking-wider mb-6">Support</h4>
           <ul className="space-y-4 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
             <li><a href="#faq" className="hover:text-[#F97316] transition-colors">FAQ</a></li>
             <li><a href="#" className="hover:text-[#F97316] transition-colors">Contact Us</a></li>
             <li><a href="#" className="hover:text-[#F97316] transition-colors">Privacy Policy</a></li>
             <li><a href="#" className="hover:text-[#F97316] transition-colors">Terms of Service</a></li>
           </ul>
        </div>

        <div>
           <h4 className="text-[13px] font-[600] text-[#F97316] uppercase tracking-wider mb-6">Join Brickly</h4>
           <ul className="space-y-4 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
             <li><Link to="/register?role=customer" className="hover:text-[#F97316] transition-colors">Register as Customer</Link></li>
             <li><Link to="/register?role=contractor" className="hover:text-[#F97316] transition-colors">Register as Contractor</Link></li>
             <li><Link to="/register?role=dealer" className="hover:text-[#F97316] transition-colors">Register as Dealer</Link></li>
             <li><Link to="/register?role=professional" className="hover:text-[#F97316] transition-colors">Register as Professional</Link></li>
           </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        <div>© {currentYear} Brickly. All rights reserved.</div>
        <div className="flex items-center gap-2 uppercase tracking-widest text-[11px] font-medium">
          Made in India <span className="text-sm">🇮🇳</span> for the construction industry
        </div>
      </div>
    </footer>
  );
};

// --- Page Export ---
export default function LandingPage() {
  return (
    <div className="scroll-smooth antialiased" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <AnimationStyles />
      <Navbar />
      <main>
        <Hero />
        <About />
        <HowItWorks />
        <Roles />
        <Features />
        <StatsBanner />
        <Testimonials />
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
