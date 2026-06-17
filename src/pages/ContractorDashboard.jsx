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
import NOTIFICATION_TABS from '../../shared/notificationConstants.json';

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
  const [activeTab, setActiveTab] = useState(NOTIFICATION_TABS.CONTRACTOR_OVERVIEW);
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

      const handleNewInterest = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("New Interest Request received!", { icon: "👋" });
      };
      socket.on('contractor:newInterestRequest', handleNewInterest);

      const handleQuoteResponse = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("New Quote Response received!", { icon: "📄" });
      };
      socket.on('contractor:newQuoteResponse', handleQuoteResponse);

      const handleOrderStatus = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("Order status updated!", { icon: "📦" });
      };
      socket.on('contractor:orderStatusUpdate', handleOrderStatus);

      const handleNewAvailability = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success(data.notification?.title || "New Professional Available!", { icon: "👷" });
      };
      socket.on('contractor:newAvailability', handleNewAvailability);

      const handleReviewReply = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("Dealer replied to your review!", { icon: "💬" });
      };
      socket.on('contractor:reviewReplyReceived', handleReviewReply);

      const handleReviewReminder = (data) => {
        setUnreadCount(prev => prev + 1);
        toast.success("Order Delivered! Don't forget to leave a review.", { icon: "⭐" });
      };
      socket.on('contractor:reviewReminder', handleReviewReminder);

      return () => {
        socket.off('contractor:newInterestRequest', handleNewInterest);
        socket.off('contractor:newQuoteResponse', handleQuoteResponse);
        socket.off('contractor:orderStatusUpdate', handleOrderStatus);
        socket.off('contractor:newAvailability', handleNewAvailability);
        socket.off('contractor:reviewReplyReceived', handleReviewReply);
        socket.off('contractor:reviewReminder', handleReviewReminder);
        socket.disconnect();
      };
    }
  }, [user]);

  const changeTab = (tab, data = null) => {
    setActiveTab(tab);
    setTabData(data);
  };

  const navItems = [
    { id: NOTIFICATION_TABS.CONTRACTOR_OVERVIEW, label: 'Overview', icon: IconLayoutDashboard },
    { id: NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS, label: 'Job Posts', icon: IconBriefcase },
    { id: NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS, label: 'Browse Professionals', icon: IconUsers },
    { id: NOTIFICATION_TABS.CONTRACTOR_PORTFOLIO, label: 'Portfolio', icon: IconPhoto },
    { id: NOTIFICATION_TABS.CONTRACTOR_REVIEWS, label: 'Reviews', icon: IconStar },
    { id: NOTIFICATION_TABS.CONTRACTOR_FIND_MATERIALS, label: 'Find Materials', icon: IconPackage },
    { id: NOTIFICATION_TABS.CONTRACTOR_MY_QUOTES, label: 'My Quotes', icon: IconFileInvoice },
    { id: NOTIFICATION_TABS.CONTRACTOR_ORDERS, label: 'Orders', icon: IconTruck },
    { id: NOTIFICATION_TABS.CONTRACTOR_DEALS_FEED, label: 'Deals Feed', icon: IconTag },
    { id: 'project-progress', label: 'Project Progress', icon: IconHammer },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case NOTIFICATION_TABS.CONTRACTOR_OVERVIEW: return <OverviewTab setActiveTab={changeTab} />;
      case NOTIFICATION_TABS.CONTRACTOR_JOB_POSTS: return <JobPostsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_BROWSE_PROFESSIONALS: return <BrowseProfessionalsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_PORTFOLIO: return <PortfolioTab />;
      case NOTIFICATION_TABS.CONTRACTOR_REVIEWS: return <ReviewsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_FIND_MATERIALS: return <MaterialsTab />;
      case NOTIFICATION_TABS.CONTRACTOR_MY_QUOTES: return <MyQuotesTab />;
      case NOTIFICATION_TABS.CONTRACTOR_ORDERS: return <OrdersTab />;
      case NOTIFICATION_TABS.CONTRACTOR_DEALS_FEED: return <DealsFeedTab />;
      case 'project-progress': return <ContractsTab tabData={tabData} setTabData={setTabData} />;
      case NOTIFICATION_TABS.CONTRACTOR_NOTIFICATIONS: return <NotificationsTab setUnreadCount={setUnreadCount} setActiveTab={changeTab} />;
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
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
                activeTab === item.id ? 'bg-accent text-white shadow-lg shadow-orange-500/20' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} className={activeTab === item.id ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
              {isSidebarOpen && <span className="text-sm font-bold">{item.label}</span>}
              {item.badge && activeTab !== item.id && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-[blink_1s_ease-in-out_infinite]" />
              )}
              {activeTab === item.id && (
                <motion.div layoutId="active" className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 space-y-2 border-t border-white/5">
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
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{navItems.find(i => i.id === activeTab)?.label || 'Notifications'}</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <ThemeToggle />
             <button onClick={() => setActiveTab(NOTIFICATION_TABS.CONTRACTOR_NOTIFICATIONS)} className="p-2 relative hover:bg-white/5 rounded-xl transition-all">
               <IconBell size={24} className={`group-hover:scale-110 transition-transform ${unreadCount > 0 ? 'animate-[blink_1s_ease-in-out_infinite] text-accent' : ''}`} style={{ color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)' }} />
               {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2" style={{ borderColor: 'var(--bg-primary)' }} />}
             </button>
             <button onClick={() => { logout(); navigate('/login'); }} className="p-2 relative hover:bg-red-500/10 rounded-xl transition-all text-red-400 hover:text-red-500" title="Sign Out">
               <IconLogout size={24} className="hover:scale-110 transition-transform" />
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
