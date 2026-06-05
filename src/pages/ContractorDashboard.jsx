import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import socket from '../socket';
import api from '../api';
import toast, { Toaster } from 'react-hot-toast';
import { 
  IconLayoutDashboard, IconBriefcase, IconUsers, IconPhoto, 
  IconStar, IconPackage, IconFileInvoice, IconTruck, 
  IconTag, IconBell, IconLogout, IconMenu2, IconX,
  IconSun, IconMoon, IconHelmet, IconHammer
} from '@tabler/icons-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

// Import Tabs (will create these next)
import OverviewTab from '../components/contractor/OverviewTab';
import JobPostsTab from '../components/contractor/JobPostsTab';
import BrowseProfessionalsTab from '../components/contractor/BrowseProfessionalsTab';
import PortfolioTab from '../components/contractor/PortfolioTab';
import ReviewsTab from '../components/contractor/ReviewsTab';
import MaterialsTab from '../components/contractor/MaterialsTab';
import MyQuotesTab from '../components/contractor/MyQuotesTab';
import OrdersTab from '../components/contractor/OrdersTab';
import DealsFeedTab from '../components/contractor/DealsFeedTab';
import NotificationsTab from '../components/contractor/NotificationsTab';
import ContractsTab from '../components/contractor/ContractsTab';

const ContractorDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [tabData, setTabData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchInitialUnread = async () => {
      try {
        const res = await api.get('/api/contractor/notifications');
        const unread = res.data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      } catch (err) {
        console.error('Failed to load initial notifications:', err);
      }
    };

    if (user) {
      fetchInitialUnread();
      socket.connect();
      socket.emit('join', user._id);

      socket.on('contractor:newInterestRequest', (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("New Interest Request received!", { icon: "👋" });
      });

      socket.on('contractor:newQuoteResponse', (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("New Quote Response received!", { icon: "📄" });
      });

      socket.on('contractor:orderStatusUpdate', (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("Order status updated!", { icon: "📦" });
      });

      socket.on('contractor:newAvailability', (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success(data.notification?.title || "New Professional Available!", { icon: "👷" });
      });

      return () => {
        socket.off('contractor:newInterestRequest');
        socket.off('contractor:newQuoteResponse');
        socket.off('contractor:orderStatusUpdate');
        socket.off('contractor:newAvailability');
        socket.disconnect();
      };
    }
  }, [user]);

  const changeTab = (tab, data = null) => {
    setActiveTab(tab);
    setTabData(data);
  };

  const navItems = [
    { label: 'Overview', icon: IconLayoutDashboard },
    { label: 'Job Posts', icon: IconBriefcase },
    { label: 'Browse Professionals', icon: IconUsers },
    { label: 'Portfolio', icon: IconPhoto },
    { label: 'Reviews', icon: IconStar },
    { label: 'Find Materials', icon: IconPackage },
    { label: 'My Quotes', icon: IconFileInvoice },
    { label: 'Orders', icon: IconTruck },
    { label: 'Deals Feed', icon: IconTag },
    { label: 'Project Progress', icon: IconHammer },
    { label: 'Notifications', icon: IconBell, badge: unreadCount > 0 },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Overview': return <OverviewTab setActiveTab={changeTab} />;
      case 'Job Posts': return <JobPostsTab />;
      case 'Browse Professionals': return <BrowseProfessionalsTab />;
      case 'Portfolio': return <PortfolioTab />;
      case 'Reviews': return <ReviewsTab />;
      case 'Find Materials': return <MaterialsTab />;
      case 'My Quotes': return <MyQuotesTab />;
      case 'Orders': return <OrdersTab />;
      case 'Deals Feed': return <DealsFeedTab />;
      case 'Project Progress': return <ContractsTab tabData={tabData} setTabData={setTabData} />;
      case 'Notifications': return <NotificationsTab setUnreadCount={setUnreadCount} />;
      default: return <OverviewTab setActiveTab={changeTab} />;
    }
  };

  return (
    <div className="flex h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <Toaster position="top-right" />
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="text-white flex flex-col z-50 overflow-hidden relative border-r"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-accent p-2 rounded-xl">
            <IconHelmet size={24} className="text-white" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xl font-black tracking-tight"
              >
                Brickly
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* User Info */}
        <div className="px-6 mb-8">
           <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white shrink-0">
               {user?.name?.charAt(0)}
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-bold truncate">{user?.companyName || user?.name}</p>
                 <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Contractor</p>
               </div>
             )}
           </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
                activeTab === item.label ? 'bg-accent text-white shadow-lg shadow-orange-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} className={activeTab === item.label ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
              {isSidebarOpen && <span className="text-sm font-bold">{item.label}</span>}
              {item.badge && activeTab !== item.label && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-[blink_1s_ease-in-out_infinite]" />
              )}
              {activeTab === item.label && (
                <motion.div layoutId="active" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-2 border-t border-white/5">
          <button 
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-300/60 hover:bg-red-500/10 hover:text-red-400 transition-all font-bold"
          >
            <IconLogout size={22} />
            {isSidebarOpen && <span className="text-sm font-bold">Log Out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top bar */}
        <header className="h-20 border-b flex items-center justify-between px-8 z-10" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {isSidebarOpen ? <IconX size={24} /> : <IconMenu2 size={24} />}
            </button>
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{activeTab}</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <ThemeToggle />
             <button onClick={() => setActiveTab('Notifications')} className="p-2 relative hover:bg-white/5 rounded-xl transition-all">
               <IconBell size={24} className={`group-hover:scale-110 transition-transform ${unreadCount > 0 ? 'animate-[blink_1s_ease-in-out_infinite] text-accent' : ''}`} style={{ color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)' }} />
               {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2" style={{ borderColor: 'var(--bg-primary)' }} />}
             </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto w-full"
            >
              {renderActiveTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default ContractorDashboard;
