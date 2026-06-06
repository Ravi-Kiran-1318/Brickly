import React, { useState, useEffect } from 'react';
import api from '../../api';
import { IconTruck, IconPackage, IconChevronRight, IconCircleCheck, IconCircleDashed, IconMap2, IconStarFilled, IconX, IconLoader2, IconMessageCircle } from '@tabler/icons-react';
import RouteMap from '../RouteMap';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const OrdersTab = () => {
  const [orders, setOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMapOrderId, setOpenMapOrderId] = useState(null);
  const [reviewModalOrder, setReviewModalOrder] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/contractor/orders'),
      api.get('/api/reviews/contractor/my-reviews')
    ]).then(([ordersRes, reviewsRes]) => {
      setOrders(ordersRes.data);
      setMyReviews(reviewsRes.data);
      setLoading(false);
    });
  }, []);

  const hasValidLocations = (o) => {
    const dl = o.dealerId?.location?.coordinates;
    const cl = o.contractorId?.location?.coordinates;
    return dl && dl.length === 2 && dl[0] !== 0 && cl && cl.length === 2 && cl[0] !== 0;
  };

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Active Orders & Delivery</h2>
      
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="h-44 bg-slate-100 dark:bg-slate-800 rounded-3xl animate-pulse" />)
        ) : orders.length > 0 ? orders.map((o) => (
          <div key={o._id} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all">
             <div className="p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                      <IconTruck size={32} />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-primary dark:text-white uppercase tracking-tight">Order #{o._id.slice(-6).toUpperCase()}</h3>
                      <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest">{o.dealerId?.shopName}</p>
                   </div>
                </div>

                <div className="flex-1 flex flex-col md:flex-row items-center gap-10">
                   {/* Progress Tracker */}
                   <div className="flex-1 flex items-center w-full px-4">
                      {['Pending', 'Confirmed', 'Dispatched', 'Delivered'].map((step, i, arr) => {
                        const statusIdx = arr.indexOf(o.status);
                        const isDone = i <= statusIdx;
                        const isCurrent = i === statusIdx;
                        return (
                          <React.Fragment key={step}>
                             <div className="flex flex-col items-center relative gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${isDone ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                   {isDone ? <IconCircleCheck size={18}/> : <IconCircleDashed size={18}/>}
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-tight ${isCurrent ? 'text-primary dark:text-white' : 'text-slate-400'}`}>{step}</span>
                             </div>
                             {i < arr.length - 1 && <div className={`flex-1 h-1 mx-1 rounded-full ${i < statusIdx ? 'bg-green-500' : 'bg-slate-100 dark:bg-slate-800'}`} />}
                          </React.Fragment>
                        );
                      })}
                   </div>
                   
                   {o.status === 'Delivered' && (
                     <div className="w-full mt-6">
                        {o.isReviewed ? (
                          <div className="w-full flex flex-col gap-2">
                             <div className="flex items-center justify-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-600 px-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest border border-green-200 dark:border-green-800/30">
                               <IconCircleCheck size={18} /> Reviewed
                             </div>
                             {myReviews.find(r => r.orderId === o._id)?.dealerReply && (
                               <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mt-2 relative">
                                  <div className="absolute -top-2 right-6 w-0 h-0 border-x-8 border-x-transparent border-b-8 border-b-slate-50 dark:border-b-slate-800"></div>
                                  <span className="flex items-center gap-1 text-[9px] font-black uppercase text-accent mb-1"><IconMessageCircle size={10} /> Dealer Reply</span>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic font-medium">{myReviews.find(r => r.orderId === o._id).dealerReply}</p>
                               </div>
                             )}
                          </div>
                        ) : new Date() > new Date(o.reviewDeadline) ? (
                         <div className="w-full text-center bg-slate-100 dark:bg-slate-800 text-slate-500 px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest">
                           Review Window Closed
                         </div>
                       ) : (
                         <button 
                           onClick={() => setReviewModalOrder(o)}
                           className="w-full bg-accent text-white px-4 py-3 rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/20 transition-all active:scale-95"
                         >
                           Leave a Review
                         </button>
                       )}
                     </div>
                   )}
                </div>

                <button className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-all">
                   <IconChevronRight size={24} />
                </button>
             </div>
             
             {/* Order Footer */}
             <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest gap-4">
                     <span>Ordered: {new Date(o.createdAt).toLocaleDateString()}</span>
                     <div className="flex items-center gap-6 text-right">
                        {hasValidLocations(o) && (
                          <button 
                            onClick={() => setOpenMapOrderId(openMapOrderId === o._id ? null : o._id)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                          >
                            <IconMap2 size={16} />
                            {openMapOrderId === o._id ? 'Hide Route' : 'View Route'}
                          </button>
                        )}
                        <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Order Amount</span>
                           <span className="text-xl font-black text-accent">₹{o.totalAmount?.toLocaleString() || 'N/A'}</span>
                        </div>
                     </div>
                  </div>
                 <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                       <span>Item Details</span>
                       <span>Pricing</span>
                    </div>
                    {o.products?.map((p, i) => (
                      <div key={i} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                         {p.productImage ? (
                           <img src={p.productImage} alt={p.productName} className="w-12 h-12 rounded-xl object-cover" />
                         ) : (
                           <div className="w-12 h-12 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                              <IconPackage size={20} />
                           </div>
                         )}
                         <div className="flex-1">
                            <h4 className="text-sm font-black text-primary dark:text-white uppercase truncate">{p.productName}</h4>
                            <p className="text-[11px] font-bold text-slate-400">{p.quantity} {p.unit}</p>
                         </div>
                         <div className="text-right">
                            <p className="text-xs font-black text-accent">₹{p.subTotal?.toLocaleString() || (p.pricePerUnit * p.quantity)?.toLocaleString() || 'N/A'}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">₹{p.pricePerUnit?.toLocaleString() || 'N/A'} / unit</p>
                         </div>
                      </div>
                    ))}
                 </div>

                  {openMapOrderId === o._id && (
                     <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                         <IconMap2 size={16} /> Delivery Route
                       </h4>
                       <RouteMap 
                         dealerLocation={o.dealerId?.location} 
                         contractorLocation={o.contractorId?.location}
                         dealerName={o.dealerId?.shopName}
                         contractorName={o.contractorId?.name || o.contractorId?.companyName}
                       />
                     </div>
                  )}
             </div>
          </div>
        )) : (
          <div className="p-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800">
             <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                <IconTruck size={48} />
             </div>
             <h3 className="text-2xl font-black text-primary dark:text-white mb-2">No orders placed</h3>
             <p className="text-slate-400 max-w-sm mx-auto">Track your material deliveries here once you accept dealer quotes.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {reviewModalOrder && (
          <LeaveReviewModal 
            order={reviewModalOrder} 
            onClose={() => setReviewModalOrder(null)} 
            onSuccess={(review) => {
              setOrders(orders.map(o => o._id === reviewModalOrder._id ? { ...o, isReviewed: true } : o));
              setReviewModalOrder(null);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const LeaveReviewModal = ({ order, onClose, onSuccess }) => {
  const [ratings, setRatings] = useState({ productQuality: 0, deliverySpeed: 0, communication: 0 });
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const overallRating = Math.round((ratings.productQuality + ratings.deliverySpeed + ratings.communication) / 3) || 0;

  const handleSubmit = async () => {
    if (ratings.productQuality === 0 || ratings.deliverySpeed === 0 || ratings.communication === 0) {
      return toast.error("Please provide all three ratings");
    }
    if (reviewText.length < 20) {
      return toast.error("Review text must be at least 20 characters");
    }
    setSubmitting(true);
    try {
      const res = await api.post('/api/reviews', {
        orderId: order._id,
        productQualityRating: ratings.productQuality,
        deliverySpeedRating: ratings.deliverySpeed,
        communicationRating: ratings.communication,
        reviewText
      });
      toast.success("Review submitted successfully");
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRow = ({ label, value, onChange }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-black uppercase tracking-widest text-slate-400">{label}</span>
      <div className="flex gap-1">
        {[1,2,3,4,5].map(star => (
          <button key={star} onClick={() => onChange(star)} className={`p-1 transition-transform hover:scale-110 ${star <= value ? 'text-orange-400' : 'text-slate-200 dark:text-slate-700'}`}>
            <IconStarFilled size={24} />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-2xl font-black text-primary dark:text-white uppercase tracking-tight">Leave a Review</h3>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{order.dealerId?.shopName}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 rounded-full text-slate-400 hover:text-primary dark:hover:text-white shadow-sm"><IconX size={20} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto space-y-8">
          <div className="space-y-6 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
             <StarRow label="Product Quality" value={ratings.productQuality} onChange={v => setRatings({...ratings, productQuality: v})} />
             <StarRow label="Delivery Speed" value={ratings.deliverySpeed} onChange={v => setRatings({...ratings, deliverySpeed: v})} />
             <StarRow label="Communication" value={ratings.communication} onChange={v => setRatings({...ratings, communication: v})} />
          </div>

          <div className="text-center py-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Overall Rating</span>
             <div className="flex justify-center gap-2">
                {[1,2,3,4,5].map(star => (
                  <IconStarFilled key={star} size={36} className={`${star <= overallRating ? 'text-accent' : 'text-slate-200 dark:text-slate-800'}`} />
                ))}
             </div>
          </div>

          <div>
             <textarea 
               value={reviewText} onChange={e => setReviewText(e.target.value)} maxLength={500}
               placeholder="Share your experience with this dealer..."
               className="w-full h-32 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white resize-none text-sm font-medium"
             />
             <div className="flex justify-between mt-2 px-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span className={reviewText.length < 20 && reviewText.length > 0 ? "text-red-400" : ""}>Min 20 chars</span>
                <span>{reviewText.length} / 500</span>
             </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
           <button 
             onClick={handleSubmit} disabled={submitting}
             className="w-full bg-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:shadow-lg hover:shadow-orange-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
           >
             {submitting ? <IconLoader2 className="animate-spin" /> : 'Submit Review'}
           </button>
        </div>
      </motion.div>
    </div>
  );
};

export default OrdersTab;
