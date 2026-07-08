import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Topbar from '../../components/Topbar';

const tabClass = ({ isActive }) =>
  `px-4 py-2 text-sm font-display font-medium border-b-2 transition-colors whitespace-nowrap ${
    isActive ? 'border-bolt-500 text-bolt-600 dark:text-bolt-300' : 'border-transparent text-ink-700/50 dark:text-cream/40'
  }`;

const AdminLayout = () => {
  const navigate = useNavigate();

  return (
    <div>
      <Topbar
        title="Admin Panel"
        leftContent={
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-3.5 rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700/70 dark:text-cream/60 hover:bg-bolt-50 dark:hover:bg-ink-700 hover:text-bolt-600 dark:hover:text-bolt-300 transition-all cursor-pointer"
          >
            <ArrowLeft size={20} />
            
          </button>
        }
      />
      <div className="px-4 lg:px-8 pt-4">
        <div className="flex gap-1 border-b border-bolt-100 dark:border-ink-700 overflow-x-auto">
          <NavLink to="/admin" end className={tabClass}>Overview</NavLink>
          <NavLink to="/admin/users" className={tabClass}>Users</NavLink>
          <NavLink to="/admin/content" className={tabClass}>Moderation</NavLink>
          <NavLink to="/admin/verification" className={tabClass}>Verification</NavLink>
          <NavLink to="/admin/reports" className={tabClass}>Reports</NavLink>
          <NavLink to="/admin/support" className={tabClass}>Support</NavLink>
        </div>
      </div>
      <div className="p-4 lg:p-8"><Outlet /></div>
    </div>
  );
};

export default AdminLayout;