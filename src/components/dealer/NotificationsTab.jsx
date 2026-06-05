import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconBell, IconTrash, IconCircleCheck, IconFileInvoice, 
  IconTag, IconPackage, IconAlertTriangle, IconTruck
} from '@tabler/icons-react';

const NotificationsTab = ({ setUnreadCount, setActiveTab }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/dealer/notifications');
      setNotifications(res.data);
      const unread = res.data.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/api/dealer/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await api.put(`/api/dealer/notifications/${notification._id}/read`);
        setNotifications(notifications.map(n => n._id === notification._id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      if (notification.actionTab && setActiveTab) {
        setActiveTab(notification.actionTab);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/api/dealer/notifications/${id}`);
      setNotifications(notifications.filter(n => n._id !== id));
      const removedUnread = !notifications.find(n => n._id === id)?.isRead;
      if (removedUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'Quote': return <IconFileInvoice size={20} />;
      case 'Order': return <IconTruck size={20} />;
      case 'Deal': return <IconTag size={20} />;
      default: return <IconBell size={20} />;
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading Notifications...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-primary dark:text-white">Your Notifications</h2>
        {notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllAsRead}
            className="text-xs font-black text-accent uppercase flex items-center gap-2 hover:bg-orange-500/10 px-4 py-2 rounded-xl transition-all"
          >
            <IconCircleCheck size={18} /> Mark all as read
          </button>
        )}
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
                  <p className="text-sm text-slate-400 font-medium">{n.message}</p>
                  <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}
                className="p-3 bg-red-50 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
              >
                <IconTrash size={20} />
              </button>
            </motion.div>
          )) : (
            <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 font-bold">
               No notifications.
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotificationsTab;
