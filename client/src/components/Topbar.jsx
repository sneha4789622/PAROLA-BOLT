import { useNavigate } from 'react-router-dom';
import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const Topbar = ({ title, leftContent }) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-bolt-100 dark:border-ink-700 bg-cream/90 dark:bg-ink-950/90 backdrop-blur px-4 py-3 lg:px-8">
      <div className="flex items-center gap-2">
        {leftContent}
        <h1 className="font-display text-xl font-bold">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/search')}
          className="lg:hidden rounded-full p-2 text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="rounded-full p-2 text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800"
          aria-label="Notifications"
        >
          <Bell size={20} />
        </button>
        <button
          onClick={toggleTheme}
          className="lg:hidden rounded-full p-2 text-ink-700 dark:text-cream/80 hover:bg-bolt-50 dark:hover:bg-ink-800"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        {user && (
          <img
            src={user.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`}
            alt={user.username}
            className="h-8 w-8 rounded-full object-cover border border-bolt-200 dark:border-ink-700 lg:hidden"
          />
        )}
      </div>
    </header>
  );
};

export default Topbar;