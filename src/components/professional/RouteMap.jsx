import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconCar, IconAlertCircle } from '@tabler/icons-react';

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom markers
const profIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const siteIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle auto-fitting bounds
const FitBounds = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
};

const RouteMap = ({ profLocation, siteLocation, profName, siteName, siteAddress }) => {
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [duration, setDuration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        setLoading(true);
        const profLng = profLocation[0];
        const profLat = profLocation[1];
        const siteLng = siteLocation[0];
        const siteLat = siteLocation[1];

        const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${profLng},${profLat};${siteLng},${siteLat}?overview=full&geometries=geojson`);
        const data = await response.json();

        if (data.code === 'Ok' && data.routes.length > 0) {
          const routeData = data.routes[0];
          // OSRM returns coordinates as [lng, lat], Leaflet Polyline expects [lat, lng]
          const latLngs = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          setRoute(latLngs);
          setDistance(routeData.distance); // in metres
          setDuration(routeData.duration); // in seconds
          setError(false);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('OSRM fetch error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [profLocation, siteLocation]);

  const formatDuration = (seconds) => {
    if (seconds < 3600) {
      const mins = Math.round(seconds / 60);
      return `${mins} minutes`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
  };

  const profLatLng = [profLocation[1], profLocation[0]];
  const siteLatLng = [siteLocation[1], siteLocation[0]];
  const bounds = route ? L.latLngBounds(route) : L.latLngBounds([profLatLng, siteLatLng]);

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
      <div className="relative h-[320px] w-full">
        {loading && (
          <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-bold text-slate-500">Calculating route...</p>
          </div>
        )}
        
        {error && !loading && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[400] bg-red-50 dark:bg-red-900/90 text-red-600 dark:text-red-100 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg">
            <IconAlertCircle size={16} /> Could not calculate route. Please try again later.
          </div>
        )}

        <MapContainer center={profLatLng} zoom={13} style={{ height: '100%', width: '100%', zIndex: 10 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={profLatLng} icon={profIcon}>
            <Popup>
              <strong>{profName || 'You'}</strong><br/>Your registered location
            </Popup>
          </Marker>
          <Marker position={siteLatLng} icon={siteIcon}>
            <Popup>
              <strong>{siteName || 'Contractor'}</strong><br/>{siteAddress}
            </Popup>
          </Marker>
          {route && <Polyline positions={route} color="#3b82f6" weight={5} opacity={0.7} />}
          <FitBounds bounds={bounds} />
        </MapContainer>
      </div>
      
      {!loading && !error && distance && duration && (
        <div className="p-4 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
            <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md text-xs uppercase tracking-widest">Road Distance</span>
            {(distance / 1000).toFixed(1)} km
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-300">
            <span className="text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-md text-xs uppercase tracking-widest flex items-center gap-1"><IconCar size={14}/> Estimated Commute</span>
            {formatDuration(duration)}
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteMap;
