import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace('/api', '')
  : 'http://localhost:5001';

const socket = io(BACKEND_URL, {
  autoConnect: false,   // don't connect until user logs in
});

export default socket;
