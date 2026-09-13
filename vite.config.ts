import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

const rootDir = process.cwd();
const buildModulesPath = path.resolve(rootDir, 'node_modules');

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      'react': path.resolve(buildModulesPath, 'react'),
      'react/jsx-runtime': path.resolve(buildModulesPath, 'react/jsx-runtime'),
      'react-dom': path.resolve(buildModulesPath, 'react-dom'),
      'react-dom/client': path.resolve(buildModulesPath, 'react-dom/client'),
      'lucide-react': path.resolve(buildModulesPath, 'lucide-react'),
      'idb': path.resolve(buildModulesPath, 'idb'),
      'clsx': path.resolve(buildModulesPath, 'clsx'),
      'tailwind-merge': path.resolve(buildModulesPath, 'tailwind-merge'),
    },
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      allow: [
        rootDir,
        buildModulesPath,
      ],
    },
  },
});
