import { NavLink } from 'react-router-dom';
import {
  Home, Compass, Clapperboard, MessageCircle, Bell,
  User, ShieldCheck, Moon, Sun, LogOut, Search, Settings, HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import VerifiedBadge from './VerifiedBadge';
import { Users, UsersRound } from 'lucide-react';

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-sm font-medium transition-colors ${
    isActive
      ? 'bg-bolt-500 text-white shadow-card'
      : 'text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800'
  }`;

const Sidebar = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  if (!user) return null;

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 h-screen sticky top-0 border-r border-bolt-100 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-6">
      <div className="flex items-center gap-2 px-2 mb-8">
        <img src="/bolt-icon.svg" alt="Parola Bolt" className="h-9 w-9 rounded-lg" />
        <div>
          <p className="font-display text-lg font-bold leading-none">Parola Bolt</p>
          <p className="text-[11px] text-ink-700/60 dark:text-cream/40">Fast. Verified. Real.</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <NavLink to="/dashboard" className={navItemClass}><Home size={18} /> Dashboard</NavLink>
        <NavLink to="/feed" className={navItemClass}><Compass size={18} /> Feed</NavLink>
        <NavLink to="/reels" className={navItemClass}><Clapperboard size={18} /> Reels</NavLink>
        <NavLink to="/messages" className={navItemClass}><MessageCircle size={18} /> Messages</NavLink>
        <NavLink to="/search" className={navItemClass}><Search size={18} /> Search</NavLink>
        <NavLink to="/notifications" className={navItemClass}><Bell size={18} /> Notifications</NavLink>
        <NavLink to={`/profile/${user.username}`} className={navItemClass}><User size={18} /> Profile</NavLink>
        <NavLink to="/settings" className={navItemClass}><Settings size={18} /> Settings</NavLink>
        <NavLink to="/help" className={navItemClass}><HelpCircle size={18} /> Help Center</NavLink>
        {['admin', 'moderator'].includes(user.role) && (
          <NavLink to="/admin" className={navItemClass}><ShieldCheck size={18} /> Admin Panel</NavLink>
        )}
      </nav>

      <div className="flex flex-col gap-1 border-t border-bolt-100 dark:border-ink-700 pt-4">
        <div className="flex items-center gap-3 px-2 py-2">
          <img
            src={user.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}&backgroundColor=6D5DFC&textColor=ffffff`}
            alt={user.username}
            className="h-9 w-9 rounded-full object-cover border border-bolt-200 dark:border-ink-700"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-sm font-semibold truncate">
              {user.fullName} {user.isIdentityVerified && <VerifiedBadge />}
            </p>
            <p className="text-xs text-ink-700/60 dark:text-cream/40 truncate">@{user.username}</p>
          </div>
        </div>
        <button onClick={toggleTheme} className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-sm font-medium text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800 w-full">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={logout} className="flex items-center gap-3 rounded-xl px-4 py-2.5 font-display text-sm font-medium text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800 w-full text-left">
          <LogOut size={18} /> Log out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
