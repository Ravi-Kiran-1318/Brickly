import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';
import { 
  IconLayoutDashboard, IconPackage, IconFileInvoice, IconTruck, 
  IconTag, IconBell, IconLogout, IconMenu2, IconX,
  IconSun, IconMoon, IconBuildingStore
} from '@tabler/icons-react';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';

import OverviewTab from '../components/dealer/OverviewTab';
import InventoryTab from '../components/dealer/InventoryTab';
import QuotesInboxTab from '../components/dealer/QuotesInboxTab';
import OrdersTab from '../components/dealer/OrdersTab';
import DealsTab from '../components/dealer/DealsTab';
import NotificationsTab from '../components/dealer/NotificationsTab';

const DealerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      socket.connect();
      socket.emit('join', user._id);

      socket.on('dealer:newQuoteRequest', (data) => {
        setUnreadCount(prev => prev + 1);
        // Toast logic could go here
      });

      socket.on('dealer:lowStock', (data) => {
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('dealer:newQuoteRequest');
        socket.off('dealer:lowStock');
        socket.disconnect();
      };
    }
  }, [user]);

  const navItems = [
    { label: 'Overview', icon: IconLayoutDashboard },
    { label: 'Inventory', icon: IconPackage },
    { label: 'Quote Requests', icon: IconFileInvoice },
    { label: 'Orders', icon: IconTruck },
    { label: 'Deals Board', icon: IconTag },
    { label: 'Notifications', icon: IconBell, badge: unreadCount > 0 },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Overview': return <OverviewTab setActiveTab={setActiveTab} />;
      case 'Inventory': return <InventoryTab />;
      case 'Quote Requests': return <QuotesInboxTab />;
      case 'Orders': return <OrdersTab />;
      case 'Deals Board': return <DealsTab />;
      case 'Notifications': return <NotificationsTab setUnreadCount={setUnreadCount} />;
      default: return <OverviewTab setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        className="text-white flex flex-col z-50 overflow-hidden relative border-r"
        style={{ backgroundColor: 'var(--sidebar-bg)', borderColor: 'var(--border)' }}
      >
        <div className="p-6 flex items-center gap-3">
          <div className="bg-accent p-2 rounded-xl">
            <IconBuildingStore size={24} className="text-white" />
          </div>
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-xl font-black tracking-tight"
              >
                BuildR Dealer
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div className="px-6 mb-8">
           <div className={`flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 ${!isSidebarOpen ? 'justify-center' : ''}`}>
             <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold text-white shrink-0">
               {user?.shopName?.charAt(0) || user?.name?.charAt(0)}
             </div>
             {isSidebarOpen && (
               <div className="overflow-hidden">
                 <p className="text-sm font-bold truncate">{user?.shopName || user?.name}</p>
                 <p className="text-[10px] text-blue-200 uppercase font-black tracking-widest">Material Dealer</p>
               </div>
             )}
           </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all relative group ${
                activeTab === item.label ? 'bg-accent text-white shadow-lg shadow-orange-500/20' : 'text-blue-100/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon size={22} className={activeTab === item.label ? 'text-white' : 'group-hover:scale-110 transition-transform'} />
              {isSidebarOpen && <span className="text-sm font-bold">{item.label}</span>}
              {item.badge && activeTab !== item.label && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-[blink_1s_ease-in-out_infinite]" />
              )}
            </button>
          ))}
        </nav>

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

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 border-b flex items-center justify-between px-8 z-10" style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg" style={{ color: 'var(--text-secondary)' }}>
              {isSidebarOpen ? <IconMenu2 size={24} /> : <IconX size={24} />}
            </button>
            <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>{activeTab}</h1>
          </div>
          
          <div className="flex items-center gap-3">
             <ThemeToggle />
              <button onClick={() => setActiveTab('Notifications')} className="p-2 relative hover:bg-white/5 rounded-xl transition-all group">
               <IconBell size={24} className={`group-hover:scale-110 transition-transform ${unreadCount > 0 ? 'animate-[blink_1s_ease-in-out_infinite] text-accent' : 'text-slate-400'}`} style={{ color: unreadCount > 0 ? 'var(--accent)' : 'var(--text-secondary)' }} />
               {unreadCount > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900" />}
              </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
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

export default DealerDashboard;
