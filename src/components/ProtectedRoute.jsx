import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth();

  // Not logged in → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role → redirect to their own dashboard
  if (allowedRole && user.role !== allowedRole) {
    const roleRedirect = {
      customer:     '/customer/dashboard',
      contractor:   '/contractor/dashboard',
      dealer:       '/dealer/dashboard',
      professional: '/professional/dashboard',
    };
    return <Navigate to={roleRedirect[user.role] || '/home'} replace />;
  }

  return children;
}
