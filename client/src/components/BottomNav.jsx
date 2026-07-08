import { NavLink } from 'react-router-dom';
import { Home, Compass, Clapperboard, MessageCircle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const itemClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 py-2 px-3 text-[11px] font-display font-medium transition-colors ${
    isActive ? 'text-bolt-500' : 'text-ink-700/60 dark:text-cream/50'
  }`;

const BottomNav = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 flex items-center justify-around border-t border-bolt-100 dark:border-ink-700 bg-white/95 dark:bg-ink-900/95 backdrop-blur lg:hidden">
      <NavLink to="/dashboard" className={itemClass}><Home size={20} />Home</NavLink>
      <NavLink to="/feed" className={itemClass}><Compass size={20} />Feed</NavLink>
      <NavLink to="/reels" className={itemClass}><Clapperboard size={20} />Reels</NavLink>
      <NavLink to="/messages" className={itemClass}><MessageCircle size={20} />Chats</NavLink>
      <NavLink to="/settings" className={itemClass}><Settings size={20} />Settings</NavLink>
    </nav>
  );
};

export default BottomNav;
