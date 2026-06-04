import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ContractorCard from '../components/ContractorCard';
import { IconSearch, IconFilter, IconShieldCheck } from '@tabler/icons-react';

const SearchContractors = () => {
  const [contractors, setContractors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    fetchContractors();
  }, [verifiedOnly]);

  const fetchContractors = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call with query params
      // axios.get(`/api/users/search?role=contractor&verifiedOnly=${verifiedOnly}`)
      
      // Mocking for demonstration
      const res = await axios.get('http://localhost:5000/api/auth/contractors'); 
      let data = res.data;
      
      if (verifiedOnly) {
        data = data.filter(c => c.phoneVerified);
      }

      // Priority sort: verified first
      data.sort((a, b) => (b.phoneVerified ? 1 : 0) - (a.phoneVerified ? 1 : 0));

      setContractors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-black text-primary mb-2">Find Contractors</h1>
          <p className="text-gray-400 font-bold tracking-tight">Browse India's top verified construction professionals</p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters */}
          <aside className="w-full lg:w-64 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="font-black text-primary mb-4 flex items-center gap-2">
                <IconFilter size={18} /> Filters
              </h3>
              
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl cursor-pointer group hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100">
                <input 
                  type="checkbox" 
                  checked={verifiedOnly}
                  onChange={(e) => setVerifiedOnly(e.target.checked)}
                  className="w-5 h-5 accent-blue-600 rounded-lg"
                />
                <span className="flex items-center gap-2 text-sm font-black text-primary">
                  <IconShieldCheck size={18} className="text-blue-600" />
                  Verified Only
                </span>
              </label>
            </div>
          </aside>

          {/* Results */}
          <div className="flex-1">
            <div className="relative mb-8">
              <IconSearch className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name, location, or specialization..."
                className="w-full pl-16 pr-6 py-5 bg-white border border-gray-100 rounded-3xl shadow-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all text-lg font-medium"
              />
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
                {[1, 2, 4].map(i => <div key={i} className="bg-gray-100 h-64 rounded-3xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {contractors.map(c => (
                  <ContractorCard key={c._id} contractor={c} />
                ))}
                {contractors.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    No contractors found matching your filters.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchContractors;
