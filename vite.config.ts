import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Optional external installation keeps this assignment's repository dependency-free.
// An ordinary `npm ci` needs no environment setting.
const require = createRequire(process.env.IMD_TOOLCHAIN
  ? resolve(process.env.IMD_TOOLCHAIN, 'package.json')
  : import.meta.url);

export default {
  base: './',
  cacheDir: process.env.IMD_TOOLCHAIN ? resolve(process.env.IMD_TOOLCHAIN, '.vite-cache') : undefined,
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: [
      { find: /^react-dom\/client$/, replacement: require.resolve('react-dom/client') },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve('react/jsx-runtime') },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve('react/jsx-dev-runtime') },
      { find: /^react$/, replacement: require.resolve('react') },
      { find: /^react-dom$/, replacement: require.resolve('react-dom') },
    ],
  },
  build: { target: 'es2020', sourcemap: false },
};
