import React from 'react';
import { PhoneVerifiedBadge } from './VerifiedBadges';
import { IconUserCircle, IconLogout } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

const DashboardHeader = ({ user }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <header className="bg-white border-b border-gray-100 py-4 px-6 mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-primary">
          <IconUserCircle size={24} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-primary">{user?.name}</h2>
            {user?.phoneVerified && <PhoneVerifiedBadge />}
          </div>
          <p className="text-xs text-gray-400 font-bold">{user?.role?.toUpperCase()}</p>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
        title="Logout"
      >
        <IconLogout size={20} />
      </button>
    </header>
  );
};

export default DashboardHeader;
