import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconTruck, IconPackage, IconUser, IconCircleCheck, 
  IconClock, IconMapPin, IconCalendar, IconChevronRight, IconArrowRight, IconMap2
} from '@tabler/icons-react';
import RouteMap from '../RouteMap';

const ORDER_STATUSES = ['Pending', 'Confirmed', 'Dispatched', 'Delivered'];

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [openMapOrderId, setOpenMapOrderId] = useState(null);
  
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    order: null,
    nextStatus: '',
    expectedDeliveryDate: ''
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/dealer/orders');
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openStatusModal = (order) => {
    const currentIndex = ORDER_STATUSES.indexOf(order.status);
    const nextStatus = currentIndex < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[currentIndex + 1] : '';
    setStatusModal({
      isOpen: true,
      order,
      nextStatus,
      expectedDeliveryDate: ''
    });
  };

  const handleUpdateStatus = async () => {
    try {
      const res = await api.put(`/api/dealer/orders/${statusModal.order._id}/status`, {
        status: statusModal.nextStatus,
        expectedDeliveryDate: statusModal.expectedDeliveryDate
      });
      setOrders(orders.map(o => o._id === statusModal.order._id ? res.data : o));
      setStatusModal({ ...statusModal, isOpen: false });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400 font-bold">Loading Orders...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {orders.length > 0 ? orders.map(order => (
          <OrderCard 
            key={order._id} 
            order={order} 
            onUpdateStatus={() => openStatusModal(order)}
            isOpenMap={openMapOrderId === order._id}
            onToggleMap={() => setOpenMapOrderId(openMapOrderId === order._id ? null : order._id)}
          />
        )) : (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconTruck size={60} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold">No orders placed yet.</p>
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      <AnimatePresence>
        {statusModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[40px] shadow-2xl relative overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-2xl font-black text-primary dark:text-white">Update Status</h3>
                <p className="text-slate-400 text-sm">Move order #{statusModal.order._id.slice(-6)} to next stage.</p>
              </div>

              <div className="p-8 space-y-6">
                <div className="flex items-center justify-center gap-4 py-4 bg-slate-50 dark:bg-slate-800 rounded-3xl">
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">Current</p>
                      <p className="font-bold text-slate-500">{statusModal.order.status}</p>
                   </div>
                   <IconArrowRight size={24} className="text-accent" />
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase text-slate-400">Next</p>
                      <p className="font-black text-accent">{statusModal.nextStatus}</p>
                   </div>
                </div>

                {statusModal.nextStatus === 'Dispatched' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400">Expected Delivery Date</label>
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={statusModal.expectedDeliveryDate} onChange={(e) => setStatusModal({...statusModal, expectedDeliveryDate: e.target.value})}
                    />
                  </div>
                )}

                <div className="flex gap-4 pt-2">
                   <button 
                     onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
                     className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 dark:hover:bg-white/5 rounded-2xl transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={handleUpdateStatus}
                     className="flex-1 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                   >
                     Confirm Status Update
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const OrderCard = ({ order, onUpdateStatus, isOpenMap, onToggleMap }) => {
  const currentStatusIndex = ORDER_STATUSES.indexOf(order.status);

  const hasValidLocations = () => {
    const dl = order.dealerId?.location?.coordinates;
    const cl = order.contractorId?.location?.coordinates;
    return dl && dl.length === 2 && dl[0] !== 0 && cl && cl.length === 2 && cl[0] !== 0;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 mb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
               <IconPackage size={32} />
            </div>
            <div>
               <div className="flex items-center gap-3 mb-1">
                 <h4 className="text-xl font-black text-primary dark:text-white">Order #{order._id.slice(-8).toUpperCase()}</h4>
                 <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                   order.status === 'Delivered' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                 }`}>
                   {order.status}
                 </span>
               </div>
               <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                 <IconUser size={16} /> {order.contractorId?.companyName || order.contractorId?.name}
               </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
             <div className="flex flex-col px-6 py-2 bg-accent/5 dark:bg-accent/10 border border-accent/20 rounded-2xl">
                <span className="text-[10px] font-black uppercase text-accent">Total Amount</span>
                <span className="text-xl font-black text-accent">₹{order.totalAmount?.toLocaleString()}</span>
             </div>
             <div className="flex flex-col px-4">
                <span className="text-[10px] font-black uppercase text-slate-400">Date Ordered</span>
                <span className="text-sm font-black text-primary dark:text-white">{new Date(order.createdAt).toLocaleDateString()}</span>
             </div>
             {order.status !== 'Delivered' && (
                <button 
                  onClick={onUpdateStatus}
                  className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-800 transition-colors ml-4"
                >
                  Update Status
                </button>
             )}
          </div>
        </div>
        
        {hasValidLocations() && (
          <div className="flex justify-end mb-6 -mt-4">
             <button 
               onClick={onToggleMap}
               className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-sm font-bold"
             >
               <IconMap2 size={18} />
               {isOpenMap ? 'Hide Delivery Route' : 'View Delivery Route'}
             </button>
          </div>
        )}

        {/* Status Line */}
        <div className="relative pt-10 pb-8 px-4">
           <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-800 -translate-y-1/2" />
           <div className="relative flex justify-between">
              {ORDER_STATUSES.map((s, idx) => (
                <div key={s} className="flex flex-col items-center">
                   <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-colors duration-500 ${
                     idx <= currentStatusIndex ? 'bg-green-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                   }`}>
                     {idx <= currentStatusIndex ? <IconCircleCheck size={18} /> : (idx + 1)}
                   </div>
                   <span className={`absolute top-0 -translate-y-8 text-[10px] font-black uppercase tracking-widest ${
                     idx <= currentStatusIndex ? 'text-green-500' : 'text-slate-400'
                   }`}>
                     {s}
                   </span>
                </div>
              ))}
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(currentStatusIndex / (ORDER_STATUSES.length - 1)) * 100}%` }}
                className="absolute top-1/2 left-0 h-1 bg-green-500 -translate-y-1/2 transition-all duration-700"
              />
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 pt-8 border-t border-slate-50 dark:border-white/5">
           <div className="space-y-4">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Delivery Information</h5>
              <div className="flex gap-3 text-sm font-medium text-slate-500">
                 <IconMapPin size={20} className="text-slate-400 shrink-0" />
                 <span>{order.deliveryAddress}</span>
              </div>
              {order.expectedDeliveryDate && (
                 <div className="flex gap-3 text-sm font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100/20">
                    <IconCalendar size={20} />
                    <span>Expected Delivery: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                 </div>
              )}
           </div>

           <div className="space-y-4">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Products Ordered</h5>
               <div className="space-y-3">
                   {order.products.map((p, i) => (
                     <div key={i} className="flex items-center justify-between text-sm font-bold bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl shadow-sm">
                        <div className="flex flex-col">
                           <span className="text-primary dark:text-white uppercase tracking-tight">{p.productName}</span>
                           <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.quantity} {p.unit}</span>
                        </div>
                        <div className="text-right">
                           <p className="text-accent font-black">Item Total: ₹{p.subTotal?.toLocaleString() || (p.pricePerUnit * p.quantity)?.toLocaleString() || 'Price not available'}</p>
                           <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Price per Unit: ₹{p.pricePerUnit?.toLocaleString() || 'N/A'}</p>
                        </div>
                     </div>
                   ))}
               </div>
           </div>
        </div>

        {isOpenMap && (
           <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
             <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
               <IconMap2 size={16} /> Delivery Route
             </h4>
             <RouteMap 
               dealerLocation={order.dealerId?.location} 
               contractorLocation={order.contractorId?.location}
               dealerName={order.dealerId?.shopName}
               contractorName={order.contractorId?.name || order.contractorId?.companyName}
             />
           </div>
        )}
      </div>
    </div>
  );
};

export default OrdersTab;
