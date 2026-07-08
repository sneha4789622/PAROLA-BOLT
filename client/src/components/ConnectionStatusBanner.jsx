import { Wifi, WifiOff, MessageSquareWarning } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { AnimatePresence, motion } from 'framer-motion';

const CONFIG = {
  online: null, // don't show a banner when everything is fine
  offline: {
    icon: WifiOff,
    label: 'Offline Mode — reconnecting…',
    classes: 'bg-ink-800 text-cream',
  },
  sms_fallback: {
    icon: MessageSquareWarning,
    label: 'SMS Fallback Mode — messages will be delivered via SMS until you reconnect',
    classes: 'bg-amber text-ink-950',
  },
};

const ConnectionStatusBanner = () => {
  const { connectionStatus } = useSocket();
  const config = CONFIG[connectionStatus];

  return (
    <AnimatePresence>
      {config && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className={`overflow-hidden ${config.classes}`}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium font-display">
            <config.icon size={14} />
            <span>{config.label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectionStatusBanner;
