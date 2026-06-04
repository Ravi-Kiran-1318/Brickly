import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconX, IconMapPin, IconPhone, IconPackage, 
  IconChevronRight, IconCheck 
} from '@tabler/icons-react';
import api from '../../api';
import toast from 'react-hot-toast';

const DealerProfileModal = ({ isOpen, onClose, dealerData, initialProduct = null }) => {
  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ 
    products: initialProduct ? [{ 
      productId: initialProduct.productId, 
      productName: initialProduct.productName, 
      quantity: 1, 
      unit: initialProduct.unit || 'unit' 
    }] : [], 
    address: '', 
    timeline: '', 
    message: initialProduct ? `Interested in deal for ${initialProduct.productName}` : '' 
  });

  if (!dealerData) return null;

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();
    if (quoteForm.products.length === 0) return toast.error("Select at least one product");
    try {
      await api.post('/api/contractor/quotes', {
        dealerId: dealerData.dealer._id,
        products: quoteForm.products,
        deliveryAddress: quoteForm.address,
        projectTimeline: quoteForm.timeline,
        message: quoteForm.message
      });
      toast.success("Quote request sent!");
      setQuoteModal(false);
      onClose();
    } catch (err) { toast.error("Failed to send quote"); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            onClick={onClose} 
            className="absolute inset-0 bg-primary/60 backdrop-blur-sm" 
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white dark:bg-slate-950 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {!quoteModal ? (
              <>
                <div className="bg-primary p-10 text-white relative">
                  <button onClick={onClose} className="absolute top-8 right-8 text-white/50 hover:text-white"><IconX size={24} /></button>
                  <h2 className="text-3xl font-black mb-2">{dealerData.dealer.shopName}</h2>
                  <div className="flex flex-wrap gap-6 text-sm text-blue-200 font-bold uppercase tracking-widest mt-4">
                    <span className="flex items-center gap-2"><IconMapPin size={18} /> {dealerData.dealer.address}</span>
                    <span className="flex items-center gap-2"><IconPhone size={18} /> {dealerData.dealer.phone}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar">
                  {dealerData.deals?.length > 0 && (
                    <section>
                      <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-4">Active Hot Deals</h4>
                      <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {dealerData.deals.map(deal => (
                          <div key={deal._id} className="bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 p-5 rounded-3xl min-w-[280px]">
                            <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">MEGA DEAL</p>
                            <h5 className="font-black text-primary dark:text-white">{deal.productName}</h5>
                            <div className="mt-3 flex items-end gap-2">
                              <span className="text-xl font-black text-primary dark:text-white">₹{deal.discountedPrice}</span>
                              <span className="text-sm text-slate-400 line-through">₹{deal.originalPrice}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                  <section>
                    <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-6">Product Inventory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {dealerData.products?.map(p => (
                        <div key={p._id} className="bg-slate-50 dark:bg-slate-900 p-5 rounded-3xl flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 overflow-hidden border border-slate-100 dark:border-slate-800">
                               {p.imageUrl ? (
                                 <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                               ) : (
                                 <IconPackage size={24}/>
                               )}
                            </div>
                            <div>
                              <p className="font-black text-primary dark:text-white uppercase tracking-tight">{p.name}</p>
                              <p className="text-xs font-bold text-slate-400">₹{p.pricePerUnit} / {p.unit}</p>
                            </div>
                          </div>
                          <div className={`text-[10px] font-black px-2 py-1 rounded-md ${p.inStock ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                            {p.inStock ? 'IN STOCK' : 'OUT OF STOCK'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                  <button onClick={() => setQuoteModal(true)} className="w-full py-5 bg-accent text-white rounded-3xl font-black flex items-center justify-center gap-3 shadow-xl shadow-orange-500/20 hover:bg-orange-600">
                    Request a Price Quote <IconChevronRight size={24} />
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="flex flex-col h-full bg-white dark:bg-slate-950">
                <div className="p-10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-2xl font-black text-primary dark:text-white">Request Quote from {dealerData.dealer.shopName}</h2>
                  <button type="button" onClick={() => setQuoteModal(false)} className="text-slate-400 hover:text-primary"><IconX size={24} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
                  <div>
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest mb-4 block">Select Products</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-medium">
                      {dealerData.products?.map(p => {
                        const isSelected = quoteForm.products.find(sp => sp.productId === p._id);
                        return (
                          <div key={p._id} className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${isSelected ? 'border-accent bg-orange-50 dark:bg-orange-950/20' : 'border-slate-50 dark:border-slate-900 bg-slate-50 dark:bg-slate-900'}`}>
                            <div className="flex items-center gap-3 mb-3 cursor-pointer" onClick={() => {
                              if (isSelected) setQuoteForm({...quoteForm, products: quoteForm.products.filter(sp => sp.productId !== p._id)});
                              else setQuoteForm({...quoteForm, products: [...quoteForm.products, { productId: p._id, productName: p.name, quantity: 1, unit: p.unit }]});
                            }}>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
                                {isSelected && <IconCheck size={14} />}
                              </div>
                              <span className="text-sm font-bold text-primary dark:text-white truncate">{p.name}</span>
                            </div>
                            {isSelected && (
                              <div className="flex items-center gap-2">
                                <input 
                                  type="number" min="1" value={isSelected.quantity} 
                                  onChange={(e) => {
                                    const newVal = parseInt(e.target.value);
                                    setQuoteForm({...quoteForm, products: quoteForm.products.map(sp => sp.productId === p._id ? {...sp, quantity: newVal} : sp)});
                                  }} 
                                  className="w-20 p-2 rounded-lg border-none outline-none text-xs font-bold bg-white dark:bg-slate-800 text-primary dark:text-white" 
                                />
                                <span className="text-[10px] font-black text-slate-400 uppercase">{p.unit}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Delivery Address</label>
                      <input 
                        name="address" required value={quoteForm.address} 
                        onChange={(e) => setQuoteForm({...quoteForm, address: e.target.value})} 
                        placeholder="Project Site Address" 
                        className="w-full p-4 rounded-2xl outline-none font-bold bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Timeline</label>
                      <input 
                        name="timeline" required value={quoteForm.timeline} 
                        onChange={(e) => setQuoteForm({...quoteForm, timeline: e.target.value})} 
                        placeholder="e.g. Needs delivery by next Tuesday" 
                        className="w-full p-4 rounded-2xl outline-none font-bold bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest block">Additional Message</label>
                    <textarea 
                      rows={3} value={quoteForm.message} 
                      onChange={(e) => setQuoteForm({...quoteForm, message: e.target.value})} 
                      className="w-full p-4 rounded-2xl outline-none font-medium resize-none bg-slate-50 dark:bg-slate-900 text-primary dark:text-white border border-slate-100 dark:border-slate-800" 
                    />
                  </div>
                </div>
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <button type="submit" className="w-full py-5 bg-primary text-white rounded-3xl font-black hover:bg-slate-800 transition-all shadow-xl shadow-primary/20">Submit Quote Request</button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default DealerProfileModal;
