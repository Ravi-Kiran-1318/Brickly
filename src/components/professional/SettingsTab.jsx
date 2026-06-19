import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';
import toast from 'react-hot-toast';
import { IconSettings, IconBellRinging, IconCircleCheck, IconMapPin, IconAlertTriangle, IconCurrentLocation } from '@tabler/icons-react';

const SettingsTab = () => {
  const { user, updateUser } = useAuth();
  const [jobAlerts, setJobAlerts] = useState(user?.jobAlerts !== false);
  const [digestFrequency, setDigestFrequency] = useState(user?.notificationPreferences?.jobDigestFrequency || 'daily');
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [locLoading, setLocLoading] = useState(false);

  useEffect(() => {
    if (user && user.jobAlerts !== undefined) {
      setJobAlerts(user.jobAlerts);
    }
    if (user && user.notificationPreferences && user.notificationPreferences.jobDigestFrequency) {
      setDigestFrequency(user.notificationPreferences.jobDigestFrequency);
    }
    if (user && user.location && user.location.coordinates) {
      setLng(user.location.coordinates[0]);
      setLat(user.location.coordinates[1]);
    }
  }, [user]);

  const handleFrequencyChange = async (e) => {
    const val = e.target.value;
    setDigestFrequency(val);
    try {
      await api.put('/api/professional/profile', {
        notificationPreferences: { jobDigestFrequency: val }
      });
      if (updateUser) {
        updateUser({
          ...user,
          notificationPreferences: {
            ...user.notificationPreferences,
            jobDigestFrequency: val
          }
        });
      }
      toast.success('Job digest frequency updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update digest frequency');
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const newStatus = !jobAlerts;
      // Need an endpoint to update profile settings
      await api.put('/api/professional/profile', { jobAlerts: newStatus });
      setJobAlerts(newStatus);
      if (updateUser) {
        updateUser({ ...user, jobAlerts: newStatus });
      }
      toast.success(`Job alerts ${newStatus ? 'enabled' : 'disabled'}!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!lat || !lng) return toast.error('Please enter both latitude and longitude');
    setLocLoading(true);
    try {
      const locationData = {
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng), parseFloat(lat)]
        }
      };
      await api.put('/api/professional/profile', locationData);
      if (updateUser) {
        updateUser({ ...user, location: locationData.location });
      }
      toast.success('Location updated successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update location');
    } finally {
      setLocLoading(false);
    }
  };

  const hasLocation = user?.location?.coordinates && user.location.coordinates.length === 2;

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-slate-200 dark:border-slate-800 shadow-sm">
        <h2 className="text-2xl font-black text-primary dark:text-white flex items-center gap-3 mb-6">
          <IconSettings size={28} className="text-accent" /> Profile Settings
        </h2>

        {!hasLocation && (
          <div className="mb-6 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-3xl p-6 flex items-start gap-4">
            <IconAlertTriangle size={24} className="text-orange-500 shrink-0" />
            <div>
              <h3 className="text-orange-800 dark:text-orange-400 font-bold text-lg mb-1">Your location is not set</h3>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Set your location to see distances and routes for job opportunities in your job feed and applications.
              </p>
            </div>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-4 md:mb-0">
              <div className={`p-4 rounded-2xl ${jobAlerts ? 'bg-accent/10 text-accent' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                <IconBellRinging size={24} />
              </div>
              <div>
                <h3 className="font-black text-primary dark:text-white text-lg">Receive Job Alerts</h3>
                <p className="text-sm font-medium text-slate-500 max-w-md">
                  Get in-app notifications and an email digest when a contractor posts a job matching your trade.
                </p>
                {jobAlerts && (
                  <div className="mt-4 flex items-center gap-3">
                    <label className="text-xs font-black uppercase text-slate-400">Digest Frequency:</label>
                    <select
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-primary dark:text-white focus:ring-2 focus:ring-accent outline-none"
                      value={digestFrequency}
                      onChange={handleFrequencyChange}
                    >
                      <option value="daily">Daily Digest</option>
                      <option value="weekly">Weekly Digest (Mondays)</option>
                      <option value="off">Off (In-App notifications only)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={handleToggle}
              disabled={loading}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${jobAlerts ? 'bg-accent' : 'bg-slate-300 dark:bg-slate-600'} ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${jobAlerts ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-500">
                <IconMapPin size={24} />
              </div>
              <div>
                <h3 className="font-black text-primary dark:text-white text-lg">Registered Location</h3>
                <p className="text-sm font-medium text-slate-500">
                  Provide your home or base location coordinates to calculate commute routes to work sites.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Latitude</label>
                <input 
                  type="number" step="any" placeholder="e.g. 19.0760"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                  value={lat} onChange={(e) => setLat(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-400 mb-2">Longitude</label>
                <input 
                  type="number" step="any" placeholder="e.g. 72.8777"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 focus:ring-2 focus:ring-accent transition-all dark:text-white font-bold"
                  value={lng} onChange={(e) => setLng(e.target.value)}
                />
              </div>
            </div>
            
            <button 
              onClick={handleUpdateLocation}
              disabled={locLoading}
              className="flex items-center gap-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
            >
              {locLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <IconCurrentLocation size={20} />}
              Save Coordinates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
