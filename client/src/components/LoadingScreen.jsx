const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-cream dark:bg-ink-950">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-bolt-200 border-t-bolt-500" />
      <p className="font-display text-sm text-bolt-700 dark:text-bolt-200">Loading Parola Bolt…</p>
    </div>
  </div>
);

export default LoadingScreen;
