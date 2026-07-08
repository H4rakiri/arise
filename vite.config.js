import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — относительные пути, чтобы сборка работала на GitHub Pages
// в подкаталоге /<repo>/ без дополнительной настройки.
export default defineConfig({
  base: './',
  plugins: [react()],
  // Воркер WebLLM использует динамический импорт → нужен ES-формат
  worker: { format: 'es' },
});
