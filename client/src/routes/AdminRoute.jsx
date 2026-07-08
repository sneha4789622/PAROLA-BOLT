import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';

const AdminRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!['admin', 'moderator'].includes(user.role)) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
};

export default AdminRoute;
