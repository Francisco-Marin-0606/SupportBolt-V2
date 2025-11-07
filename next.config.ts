import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  eslint: {
    // Deshabilita ESLint durante la construcción
    ignoreDuringBuilds: true,
  },
  // Configuración para evitar errores de prerrenderizado con hooks de React
  staticPageGenerationTimeout: 180,
  // Permitir renderizado dinámico en lugar de export estático
  output: "standalone",
  
  // Rewrite rules from next.config.js
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
  
  // Configura el tiempo de caché dinámico para el router
  experimental: {
    // Ajustar cómo se gestionan los componentes en el router client-side
    staleTimes: {
      dynamic: 30,
    },
    // Otras opciones experimentales seguras
    typedRoutes: true,
    optimizePackageImports: ['react', 'react-dom', 'lucide-react'],
  },
};

export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

org: "mental-magnet",
project: "web-support",

// Only print logs for uploading source maps in CI
silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
automaticVercelMonitors: true,
});