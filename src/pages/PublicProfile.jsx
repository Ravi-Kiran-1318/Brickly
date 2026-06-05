import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import { PhoneVerifiedBadge, GSTVerifiedBadge } from '../components/VerifiedBadges';
import { IconMapPin, IconCalendar, IconMail, IconPhone } from '@tabler/icons-react';

const PublicProfile = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/api/auth/profile/${id}`);
        setProfile(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) return <div className="p-20 text-center animate-pulse font-black">Loading Profile...</div>;
  if (!profile) return <div className="p-20 text-center text-red-500 font-black">Profile not found</div>;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-primary h-64 w-full relative">
        <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 lg:left-32 lg:translate-x-0">
          <div className="w-32 h-32 lg:w-40 lg:h-40 bg-white p-2 rounded-3xl shadow-xl">
            <img 
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${profile.companyName || profile.name}`} 
              className="w-full h-full rounded-2xl object-cover" 
              alt="Avatar"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-24 lg:pt-8 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="lg:ml-72 mb-8">
            <h1 className="text-4xl font-black text-primary mb-2">
              {profile.companyName || profile.shopName || profile.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="text-gray-400 font-bold uppercase tracking-widest text-xs px-3 py-1 bg-slate-100 rounded-full">
                {profile.role}
              </span>
              {profile.phoneVerified && <PhoneVerifiedBadge />}
              {profile.isVerified && <GSTVerifiedBadge />}
            </div>

            <p className="text-gray-500 text-lg leading-relaxed max-w-2xl">
              {profile.about || `Highly skilled ${profile.role} serving the ${profile.locationDetails?.city || 'local'} area with excellence and integrity.`}
            </p>
          </div>

          <div className="lg:ml-72 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-black text-primary">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <IconMail size={18} className="text-accent" />
                  <span>{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <IconPhone size={18} className="text-accent" />
                  <span>{profile.phoneVerified ? profile.phone : 'Verify to view'}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <IconMapPin size={18} className="text-accent" />
                  <span>{profile.locationDetails?.displayName || 'India'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
              <h3 className="font-black text-primary">Professional Details</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-500 text-sm">
                  <IconCalendar size={18} className="text-accent" />
                  <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
                </div>
                {profile.specialization && (
                  <div className="flex items-center gap-3 text-gray-500 text-sm font-bold">
                    <span>Specialization: {profile.specialization}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
