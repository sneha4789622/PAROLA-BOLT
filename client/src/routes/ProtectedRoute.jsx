import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  // Admin/seed/demo accounts are exempt (same accounts that skip biometric).
  const isExempt = user.biometric?.exempt || user.role === 'admin';
  const needsAadhaar = !isExempt && !user.aadhaarVerified;

  if (needsAadhaar && location.pathname !== '/aadhaar-verification') {
    return <Navigate to="/aadhaar-verification" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
