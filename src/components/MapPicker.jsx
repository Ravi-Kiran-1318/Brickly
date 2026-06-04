import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import { IconMapPin, IconCurrentLocation, IconLoader2, IconAlertCircle } from '@tabler/icons-react';
import toast from 'react-hot-toast';

// Component to handle map clicks
function LocationMarker({ position, setPosition, onLocationChange }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationChange(lat, lng);
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

// Component to handle map view reset and flyTo
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 16);
    }
  }, [center, map]);
  return null;
}

const MapPicker = ({ onLocationSelect, initialLocation }) => {
  const [position, setPosition] = useState(initialLocation?.lat ? [initialLocation.lat, initialLocation.lng] : null);
  const [accuracy, setAccuracy] = useState(null);
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // Center of India
  const [isLocating, setIsLocating] = useState(false);
  const watchId = useRef(null);

  // Sync position when initialLocation changes externally (e.g. from parent)
  useEffect(() => {
    if (initialLocation?.lat && (!position || position[0] !== initialLocation.lat || position[1] !== initialLocation.lng)) {
      const newPos = [initialLocation.lat, initialLocation.lng];
      setPosition(newPos);
      if (!initialLocation.displayName) {
        handleReverseGeocode(initialLocation.lat, initialLocation.lng);
      }
    }
  }, [initialLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  const handleReverseGeocode = async (lat, lng, acc = null) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = response.data;
      const address = data.address || {};
      
      const locationInfo = {
        lat,
        lng,
        accuracy: acc,
        displayName: data.display_name,
        city: address.city || address.town || address.village || address.suburb || '',
        state: address.state || '',
        country: address.country || '',
        pincode: address.postcode || '',
      };
      
      onLocationSelect(locationInfo);
    } catch (error) {
      console.error("Error reverse geocoding:", error);
      onLocationSelect({
        lat,
        lng,
        accuracy: acc,
        displayName: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        city: '', state: '', country: '', pincode: '',
      });
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // First get current position quickly
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newPos = [latitude, longitude];
        setPosition(newPos);
        setAccuracy(accuracy);
        handleReverseGeocode(latitude, longitude, accuracy);
        setIsLocating(false);
        toast.success("Location retrieved with high accuracy");
      },
      (err) => {
        setIsLocating(false);
        handleGeoError(err);
      },
      options
    );

    // Then start watching for changes
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newPos = [latitude, longitude];
        setPosition(newPos);
        setAccuracy(accuracy);
        // We only reverse geocode on significant changes or just once for the tracker to avoid API spam
        // but for this app, let's just update the position visually
      },
      (err) => {
        console.error("WatchPosition error:", err);
      },
      options
    );
  };

  const handleGeoError = (error) => {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        toast.error("Location permission denied. Please allow it in settings.");
        break;
      case error.POSITION_UNAVAILABLE:
        toast.error("Location information is unavailable.");
        break;
      case error.TIMEOUT:
        toast.error("Location request timed out.");
        break;
      default:
        toast.error("An unknown error occurred while detecting location.");
        break;
    }
  };

  return (
    <div className="relative w-full overflow-hidden flex flex-col gap-3">
      <div className="relative w-full h-[380px] rounded-xl overflow-hidden border border-gray-200">
        <MapContainer
          center={mapCenter}
          zoom={5}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            position={position} 
            setPosition={setPosition} 
            onLocationChange={(lat, lng) => {
              setPosition([lat, lng]);
              handleReverseGeocode(lat, lng);
            }} 
          />
          {position && accuracy && (
            <Circle 
              center={position} 
              radius={accuracy} 
              pathOptions={{ fillColor: '#F97316', color: '#F97316', fillOpacity: 0.1, weight: 1 }}
            />
          )}
          <ChangeView center={position || mapCenter} />
        </MapContainer>

        {/* Floating Controls */}
        <button 
          onClick={startTracking}
          disabled={isLocating}
          className="absolute bottom-6 right-6 z-[1000] bg-white text-primary p-3 rounded-xl shadow-2xl border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all flex items-center justify-center"
        >
          {isLocating ? <IconLoader2 size={24} className="animate-spin text-accent" /> : <IconCurrentLocation size={24} className="text-accent" />}
        </button>

        {isLocating && (
          <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] z-[999] flex items-center justify-center">
            <div className="bg-white px-6 py-4 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-3">
              <IconLoader2 size={20} className="animate-spin text-accent" />
              <span className="font-bold text-sm text-primary">Fetching GPS location...</span>
            </div>
          </div>
        )}
      </div>

      {position && (
        <div className="flex items-center gap-4 bg-gray-50 px-4 py-3 rounded-xl border border-gray-100">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-400">Current Coordinates</span>
            <p className="text-xs font-mono font-bold text-primary">
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </p>
          </div>
          {accuracy && (
            <div className="flex flex-col border-l border-gray-200 pl-4">
              <span className="text-[10px] font-black uppercase text-gray-400">Accuracy</span>
              <p className={`text-xs font-bold ${accuracy < 50 ? 'text-green-600' : 'text-orange-500'}`}>
                ± {Math.round(accuracy)} meters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MapPicker;
