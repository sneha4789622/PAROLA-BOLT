import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Users } from 'lucide-react';

const AuthLayout = ({ children, title, subtitle }) => {
  return (
    <div className="min-h-screen flex bg-cream dark:bg-ink-950 font-body">
      {/* Branded hero panel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-bolt-900 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-bolt-600 via-bolt-900 to-ink-950" />

        {/* Animated bolt signature */}
        <motion.div
          className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-amber/20 blur-3xl"
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-mint/15 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 text-cream">
          <div className="flex items-center gap-3">
            <img src="/bolt-icon.svg" alt="Parola Bolt" className="h-10 w-10 rounded-xl" />
            <span className="font-display text-2xl font-bold">Parola Bolt</span>
          </div>

          <div>
            <motion.h2
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="font-display text-4xl font-bold leading-tight mb-4"
            >
              Real people.
              <br />
              Verified identities.
              <br />
              <span className="text-amber">Genuine</span> connection.
            </motion.h2>
            <p className="text-cream/70 max-w-md">
              Parola Bolt verifies every account so the people you talk to are exactly who they say they are —
              and messages still get through, even offline.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-cream/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <ShieldCheck size={18} className="text-mint" />
                </span>
                Biometric + identity verification for every account
              </div>
              <div className="flex items-center gap-3 text-sm text-cream/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Zap size={18} className="text-amber" />
                </span>
                Real-time messaging with offline SMS fallback
              </div>
              <div className="flex items-center gap-3 text-sm text-cream/80">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Users size={18} className="text-bolt-300" />
                </span>
                A feed built for positive, meaningful interactions
              </div>
            </div>
          </div>

          <p className="text-xs text-cream/40">© {new Date().getFullYear()} Parola Bolt. All rights reserved.</p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/bolt-icon.svg" alt="Parola Bolt" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-xl font-bold">Parola Bolt</span>
          </div>
          <h1 className="font-display text-2xl font-bold mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-ink-700/60 dark:text-cream/50 mb-6">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
