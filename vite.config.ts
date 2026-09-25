import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const onesignalAppId =
    process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
    env.NEXT_PUBLIC_ONESIGNAL_APP_ID ||
    process.env.ONESIGNAL_APP_ID ||
    env.ONESIGNAL_APP_ID ||
    '10a14311-a42a-4681-9682-ce965d80ae75';

  return {
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html-transform-onesignal',
        transformIndexHtml(html) {
          return html.replace(/%NEXT_PUBLIC_ONESIGNAL_APP_ID%/g, onesignalAppId);
        },
      },
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GOOGLE_MAPS_PLATFORM_KEY': JSON.stringify(env.GOOGLE_MAPS_PLATFORM_KEY || ''),
      'process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID': JSON.stringify(onesignalAppId),
      'process.env.ONESIGNAL_APP_ID': JSON.stringify(onesignalAppId),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    ssr: {
      noExternal: ['browser-image-compression'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
