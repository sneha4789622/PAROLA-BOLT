import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import ConnectionStatusBanner from './ConnectionStatusBanner';

const titles = {
  '/dashboard': 'Dashboard',
  '/feed': 'Feed',
  '/reels': 'Reels',
  '/messages': 'Messages',
  '/search': 'Search',
  '/notifications': 'Notifications',
};

const AppLayout = () => {
  return (
    <div className="flex min-h-screen bg-cream dark:bg-ink-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <ConnectionStatusBanner />
        <main className="flex-1 pb-20 lg:pb-0">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
export { titles };
