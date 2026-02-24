import Link from 'next/link';
import { encodeConfig, DEFAULT_CONFIG } from '@/lib/config';
import AppIcon from '@/components/AppIcon';

export default function Home() {
  const defaultConfigUrl = encodeConfig(DEFAULT_CONFIG);
  // Next.js <Link> automatically adds basePath, so use root-relative paths
  const configurePath = '/configure';
  const displayPath = `/display?config=${defaultConfigUrl}`;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient mesh */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(ellipse at 20% 20%, rgba(183, 149, 39, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(3, 86, 66, 0.3) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(183, 149, 39, 0.1) 0%, transparent 70%)
          `,
        }}
      />

      {/* Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="max-w-2xl text-center space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span
                className="w-4 h-4 rounded-full animate-pulse"
                style={{ backgroundColor: '#B79527' }}
              />
              <span
                className="w-2 h-2 rounded-full opacity-60"
                style={{ backgroundColor: '#B79527' }}
              />
              <span
                className="w-1 h-1 rounded-full opacity-30"
                style={{ backgroundColor: '#B79527' }}
              />
            </div>
            <h1 className="text-6xl md:text-7xl font-display font-bold tracking-tight">
              Campus Hub
            </h1>
            <p className="text-xl text-white/60 max-w-md mx-auto leading-relaxed">
              Modular digital signage for campus displays. Configure once, deploy anywhere.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href={configurePath}
              className="group px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center gap-3"
              style={{ backgroundColor: '#B79527', color: '#035642' }}
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:rotate-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              Configure Display
            </Link>

            <Link
              href={displayPath}
              className="group px-8 py-4 rounded-xl font-semibold text-lg border-2 transition-all hover:scale-105 hover:bg-white/5 flex items-center gap-3"
              style={{ borderColor: '#B79527', color: '#B79527' }}
            >
              <svg
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              View Demo
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(183, 149, 39, 0.2)' }}
              >
                <AppIcon name="link" className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1">URL-Based Config</h3>
              <p className="text-sm text-white/50">
                Settings encoded in URL. Share displays instantly without a backend.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(183, 149, 39, 0.2)' }}
              >
                <AppIcon name="puzzle" className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1">Modular Widgets</h3>
              <p className="text-sm text-white/50">
                Mix and match widgets. Each pulls from its own API endpoint.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: 'rgba(183, 149, 39, 0.2)' }}
              >
                <AppIcon name="palette" className="w-5 h-5" />
              </div>
              <h3 className="font-semibold mb-1">Drag & Drop</h3>
              <p className="text-sm text-white/50">
                Visual configurator with grid layout. Design displays in minutes.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-white/30 text-sm flex items-center justify-center gap-4">
        <span>Built for digital signage displays</span>
        <span className="text-white/20">·</span>
        <a href="/docs/" className="text-white/40 hover:text-white/70 transition-colors underline underline-offset-2">
          Documentation
        </a>
      </footer>
    </div>
  );
}
