import React, { useState, useEffect } from 'react';
import api from '../../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconPlus, IconSearch, IconFilter, IconEdit, IconTrash, 
  IconPackage, IconAlertTriangle, IconCamera, IconX
} from '@tabler/icons-react';

const CATEGORIES = ['Cement', 'Steel', 'Bricks', 'Sand', 'Tiles', 'Wood', 'Electrical', 'Plumbing', 'Paint', 'Glass', 'Roofing', 'Other'];

const InventoryTab = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '', category: 'Cement', brand: '', unit: '',
    pricePerUnit: '', minimumOrderQuantity: '', stockQuantity: '',
    lowStockThreshold: '', description: '', inStock: true, size: ''
  });
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [search, category]);

  const fetchProducts = async () => {
    try {
      const res = await api.get(`/api/dealer/products`, { params: { search, category } });
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '', category: 'Cement', brand: '', unit: '',
      pricePerUnit: '', minimumOrderQuantity: '', stockQuantity: '',
      lowStockThreshold: '', description: '', inStock: true, size: ''
    });
    setImage(null);
    setPreview(null);
    setIsFormOpen(false);
    setEditingProduct(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => data.append(key, formData[key]));
    if (image) data.append('image', image);

    try {
      if (editingProduct) {
        await api.put(`/api/dealer/products/${editingProduct._id}`, data);
      } else {
        await api.post('/api/dealer/products', data);
      }
      fetchProducts();
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product permanently?')) return;
    try {
      await api.delete(`/api/dealer/products/${id}`);
      setProducts(products.filter(p => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStock = async (product) => {
    try {
      const res = await api.put(`/api/dealer/products/${product._id}`, { inStock: !product.inStock });
      setProducts(products.map(p => p._id === product._id ? res.data : p));
    } catch (err) {
      console.error(err);
    }
  };

  const editProduct = (p) => {
    setEditingProduct(p);
    setFormData({
      name: p.name, category: p.category, brand: p.brand || '', unit: p.unit,
      pricePerUnit: p.pricePerUnit || '', minimumOrderQuantity: p.minimumOrderQuantity || '',
      stockQuantity: p.stockQuantity !== undefined && p.stockQuantity !== null ? p.stockQuantity : '', 
      lowStockThreshold: p.lowStockThreshold !== undefined && p.lowStockThreshold !== null ? p.lowStockThreshold : '',
      description: p.description || '', inStock: p.inStock, size: p.size || ''
    });
    setPreview(p.imageUrl);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && products.length === 0) return <div className="p-8 text-center text-slate-400 font-bold">Loading Inventory...</div>;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-primary dark:text-white">Inventory Management</h2>
          <p className="text-sm text-slate-400">Manage your product catalog and stock levels.</p>
        </div>
        {!isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="bg-accent text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:shadow-lg hover:shadow-orange-500/20 transition-all"
          >
            <IconPlus size={20} /> Add Product
          </button>
        )}
      </div>

      {/* Form Section */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[40px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xl"
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-black text-primary dark:text-white">{editingProduct ? 'Edit Product' : 'Create New Product'}</h3>
                <button onClick={resetForm} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-400 transition-colors">
                  <IconX size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left: Image Upload */}
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Product Image</label>
                  <label className="relative group cursor-pointer block aspect-square rounded-[30px] border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950 hover:border-accent transition-all">
                    {preview ? (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 group-hover:text-accent transition-colors">
                        <IconCamera size={40} />
                        <span className="text-xs font-bold mt-2">Upload Image</span>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                  </label>
                </div>

                {/* Middle & Right: Details */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Product Name</label>
                    <input 
                      type="text" required placeholder="e.g. UltraTech Cement"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
                      value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Brand</label>
                    <input 
                      type="text" placeholder="e.g. UltraTech"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.brand} onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Size / Dimensions</label>
                    <input 
                      type="text" placeholder={formData.category === 'Steel' ? 'e.g. 12mm' : formData.category === 'Cement' ? 'e.g. 50kg' : formData.category === 'Tiles' ? 'e.g. 2x2 ft' : 'e.g. Large, 10mm'}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.size} onChange={(e) => setFormData({...formData, size: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Price per Unit (INR)</label>
                    <input 
                      type="number" required placeholder="0.00"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.pricePerUnit} onChange={(e) => setFormData({...formData, pricePerUnit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Unit</label>
                    <input 
                      type="text" required placeholder="e.g. Bag, Ton, SqFt"
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.unit} onChange={(e) => setFormData({...formData, unit: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Stock Quantity</label>
                    <input 
                      type="number" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.stockQuantity} onChange={(e) => setFormData({...formData, stockQuantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Low Stock Threshold</label>
                    <input 
                      type="number" required
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
                      value={formData.lowStockThreshold} onChange={(e) => setFormData({...formData, lowStockThreshold: e.target.value})}
                    />
                  </div>
                  <div className="sm:col-span-2">
                     <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</label>
                     <textarea 
                        className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white h-24 resize-none"
                        value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                     />
                  </div>
                </div>

                <div className="md:col-span-3 flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button type="button" onClick={resetForm} className="px-8 py-4 text-slate-500 font-bold hover:bg-slate-100 dark:hover:bg-white/5 rounded-2xl transition-all">
                    Cancel
                  </button>
                  <button type="submit" className="px-12 py-4 bg-accent text-white font-black rounded-2xl hover:shadow-lg hover:shadow-orange-500/20 transition-all">
                    {editingProduct ? 'Save Changes' : 'Create Product'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center gap-4">
        <div className="flex-1 relative w-full">
           <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
           <input 
              type="text" placeholder="Search by product name..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white"
              value={search} onChange={(e) => setSearch(e.target.value)}
           />
        </div>
        <div className="relative w-full md:w-64">
           <IconFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
           <select 
             className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-accent transition-all dark:text-white appearance-none"
             value={category} onChange={(e) => setCategory(e.target.value)}
           >
             <option value="All">All Categories</option>
             {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map(p => (
          <ProductCard 
            key={p._id} 
            product={p} 
            onEdit={() => editProduct(p)} 
            onDelete={() => deleteProduct(p._id)} 
            onToggleStock={() => toggleStock(p)}
          />
        ))}
        {products.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-slate-200 dark:border-slate-800">
             <IconPackage size={60} className="mx-auto text-slate-300 mb-4" />
             <p className="text-slate-400 font-bold">No products found. Start adding some!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProductCard = ({ product, onEdit, onDelete, onToggleStock }) => {
  const isLowStock = product.stockQuantity <= product.lowStockThreshold;

  return (
    <motion.div 
      layout
      className="bg-white dark:bg-slate-900 rounded-[35px] border border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-accent transition-all shadow-sm hover:shadow-xl"
    >
      <div className="aspect-square bg-slate-100 dark:bg-slate-950 relative overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <IconPackage size={64} />
          </div>
        )}
        <div className="absolute top-4 right-4 flex flex-col gap-2">
           <button onClick={onEdit} className="p-2.5 bg-white shadow-lg rounded-xl text-primary hover:text-accent transition-colors">
              <IconEdit size={18} />
           </button>
           <button onClick={onDelete} className="p-2.5 bg-white shadow-lg rounded-xl text-primary hover:text-red-500 transition-colors">
              <IconTrash size={18} />
           </button>
        </div>
        {isLowStock && (
           <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-orange-500 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-lg">
             <IconAlertTriangle size={12} /> Low Stock
           </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category} • {product.brand}{product.size ? ` • ${product.size}` : ''}</span>
          <h4 className="font-black text-primary dark:text-white truncate mt-1">{product.name}</h4>
        </div>

        <div className="flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Price per {product.unit}</span>
             <span className="text-lg font-black text-accent leading-none">₹{product.pricePerUnit}</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-bold text-slate-400 uppercase">Stock</span>
             <span className={`text-sm font-black ${product.stockQuantity === 0 ? 'text-red-500' : 'text-primary dark:text-blue-100'}`}>
                {product.stockQuantity} {product.unit}
             </span>
           </div>
        </div>

        <div className="pt-2 flex items-center justify-between border-t border-slate-50 dark:border-white/5">
           <button 
             onClick={onToggleStock}
             className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl transition-all ${
               product.inStock ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
             }`}
           >
             {product.inStock ? 'In Stock' : 'Out of Stock'}
           </button>
           <span className="text-[10px] font-bold text-slate-400 uppercase">MOQ: {product.minimumOrderQuantity}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default InventoryTab;
