import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { IconMapPinFilled, IconBuildingStore, IconTruckDelivery, IconAlertCircle } from '@tabler/icons-react';

// Fix for default marker icons in leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Create custom icons using standard Leaflet options
const createCustomIcon = (color) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const dealerIcon = createCustomIcon('green');
const contractorIcon = createCustomIcon('red');

const RouteMap = ({ dealerLocation, contractorLocation, dealerName, contractorName }) => {
  const [route, setRoute] = useState(null);
  const [routeStats, setRouteStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate locations
  const isValidLocation = (loc) => loc && loc.coordinates && loc.coordinates.length === 2 && loc.coordinates[0] !== 0 && loc.coordinates[1] !== 0;

  useEffect(() => {
    const fetchRoute = async () => {
      if (!isValidLocation(dealerLocation) || !isValidLocation(contractorLocation)) {
        setLoading(false);
        return;
      }

      // GeoJSON is [longitude, latitude], Leaflet needs [latitude, longitude]
      const [dealerLng, dealerLat] = dealerLocation.coordinates;
      const [contractorLng, contractorLat] = contractorLocation.coordinates;

      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${dealerLng},${dealerLat};${contractorLng},${contractorLat}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        if (data.code === 'Ok' && data.routes.length > 0) {
          const routeData = data.routes[0];
          
          // OSRM returns geometry as [longitude, latitude], map it to [latitude, longitude] for Leaflet Polyline
          const coordinates = routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
          
          setRoute(coordinates);
          setRouteStats({
            distance: (routeData.distance / 1000).toFixed(1), // Convert meters to km
            duration: Math.ceil(routeData.duration / 60) // Convert seconds to minutes
          });
        } else {
          setError("Could not calculate route between these locations.");
        }
      } catch (err) {
        setError("Error fetching route data.");
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [dealerLocation, contractorLocation]);

  if (!isValidLocation(dealerLocation) || !isValidLocation(contractorLocation)) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl h-[300px] flex items-center justify-center border border-slate-200 dark:border-slate-700">
        <div className="animate-pulse flex flex-col items-center">
          <IconMapPinFilled size={32} className="text-slate-300 mb-2" />
          <p className="text-sm font-bold text-slate-400">Loading route map...</p>
        </div>
      </div>
    );
  }

  const dealerPos = [dealerLocation.coordinates[1], dealerLocation.coordinates[0]];
  const contractorPos = [contractorLocation.coordinates[1], contractorLocation.coordinates[0]];
  
  // Calculate bounds to fit both markers
  const bounds = [dealerPos, contractorPos];

  return (
    <div className="flex flex-col space-y-2">
      {routeStats && (
        <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold">
          <div className="flex items-center gap-2 text-primary dark:text-white">
            <span className="bg-green-100 text-green-600 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Distance</span>
            {routeStats.distance} km
          </div>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 hidden sm:block"></div>
          <div className="flex items-center gap-2 text-primary dark:text-white">
            <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Est. Time</span>
            ~{routeStats.duration} mins
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-500 p-3 rounded-xl text-xs font-bold border border-red-100">
          {error}
        </div>
      )}

      <div className="h-[300px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 relative z-0">
        <MapContainer 
          bounds={bounds} 
          boundsOptions={{ padding: [50, 50] }}
          className="w-full h-full"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <Marker position={dealerPos} icon={dealerIcon}>
            <Popup className="font-bold">
              <div className="flex items-center gap-1.5 text-primary">
                <IconBuildingStore size={16} className="text-green-600" />
                {dealerName || "Dealer Shop"}
              </div>
            </Popup>
          </Marker>

          <Marker position={contractorPos} icon={contractorIcon}>
            <Popup className="font-bold">
              <div className="flex items-center gap-1.5 text-primary">
                <IconTruckDelivery size={16} className="text-red-600" />
                {contractorName || "Delivery Location"}
              </div>
            </Popup>
          </Marker>

          {route && (
            <Polyline 
              positions={route} 
              color="#3b82f6" 
              weight={4} 
              opacity={0.8}
              lineCap="round"
              lineJoin="round"
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default RouteMap;
