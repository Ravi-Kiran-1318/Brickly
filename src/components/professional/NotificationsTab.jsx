import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconBell, IconTrash, IconCircleCheck, IconBriefcase, 
  IconClipboardText, IconInfoCircle, IconUserCircle,
  IconX, IconAlertTriangle, IconCheck
} from '@tabler/icons-react';

const NotificationsTab = ({ setUnreadCount, setActiveTab }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/professional/notifications');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAll = async () => {
    try {
      await api.delete('/api/professional/notifications/delete-all');
      setNotifications([]);
      setUnreadCount(0);
      setShowClearConfirm(false);
    } catch (err) { console.error(err); }
  };
  

  const markAllAsRead = async () => {
    try {
      await api.put('/api/professional/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/api/professional/notifications/${notification._id}/read`);
        setNotifications(notifications.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (notification.actionTab && setActiveTab) {
        if (notification.title === 'Notice Period Complete') {
          localStorage.setItem('showNoticeCompleteBanner', 'true');
        }
        if (notification.title === 'Contractor Replied to Your Review') {
          localStorage.setItem('reviewsSubTab', 'left');
          localStorage.setItem('highlightReviewId', notification.relatedId);
        }
        setActiveTab(notification.actionTab);
        if (notification.relatedId) {
          setTimeout(() => {
            const element = document.getElementById(`request-${notification.relatedId}`) || document.getElementById(`job-${notification.relatedId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.classList.add('ring-4', 'ring-accent', 'ring-offset-4', 'dark:ring-offset-slate-900', 'transition-all', 'duration-500');
              setTimeout(() => {
                element.classList.remove('ring-4', 'ring-accent', 'ring-offset-4', 'dark:ring-offset-slate-900');
              }, 3000);
            }
          }, 300);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/api/professional/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      const removedUnread = !notifications.find(n => n._id === id)?.isRead;
      if (removedUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Job': return <IconBriefcase size={20} />;
      case 'Application': return <IconClipboardText size={20} />;
      case 'System': return <IconInfoCircle size={20} />;
      default: return <IconBell size={20} />;
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold tracking-widest uppercase text-xs">Fetching updates...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white">Recent Updates</h2>
        <div className="flex gap-4">
          {notifications.some(n => !n.isRead) && (
            <button onClick={markAllAsRead} className="text-sm font-bold text-accent hover:underline flex items-center gap-1.5 transition-all">
               <IconCheck size={18}/> Mark all as read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)} className="text-sm font-bold text-red-500 hover:underline flex items-center gap-1.5 transition-all">
               <IconTrash size={18}/> Clear all
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {notifications.length > 0 ? notifications.map((n) => (
            <motion.div 
              layout
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              key={n._id}
              onClick={() => handleNotificationClick(n)}
              className={`bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center justify-between group cursor-pointer transition-all ${
                !n.isRead ? 'border-l-4 border-l-accent' : ''
              }`}
            >
              <div className="flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  !n.isRead ? 'bg-accent/10 text-accent' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                }`}>
                  {getIcon(n.type)}
                </div>
                <div>
                  <h4 className={`font-black tracking-tight ${!n.isRead ? 'text-primary dark:text-white' : 'text-slate-500'}`}>
                    {n.title}
                  </h4>
                  <p className="text-sm text-slate-400 font-medium line-clamp-1">{n.message}</p>
                  <div className="flex items-center gap-3 mt-1">
                     <p className="text-[10px] font-bold text-slate-300 uppercase">
                       {new Date(n.createdAt).toLocaleString()}
                     </p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                 <button 
                   onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                   className="p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                 >
                   <IconTrash size={20} />
                 </button>
              </div>
            </motion.div>
          )) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-widest text-xs">
               All caught up!
            </div>
          )}
        </AnimatePresence>
      </div>
    
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)} />
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[32px] p-8 relative z-10 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
               <IconAlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-primary dark:text-white mb-2">Delete all notifications?</h3>
            <p className="text-slate-500 text-sm mb-8">This action cannot be undone. Are you sure you want to permanently delete all notifications?</p>
            <div className="flex gap-4">
               <button onClick={() => setShowClearConfirm(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
               <button onClick={handleDeleteAll} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-600 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}
    </div>
  
  );
};

export default NotificationsTab;
