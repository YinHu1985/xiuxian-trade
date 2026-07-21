import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: '/xiuxian-trade/',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
            process.env.NODE_ENV === 'development' ? 'react-dev-locator' : null,
          ].filter(Boolean) as string[],
      },
    }),
    tsconfigPaths()
  ],
})
