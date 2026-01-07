import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

// Read deployed Lambda URLs from CDK outputs
let chatApiUrl = 'https://ukxa7eu5rks24eoeb445lzzhoi0lsgjj.lambda-url.eu-central-1.on.aws/';
let conversationsApiUrl = 'https://qsd2li2o2hv64wwypr52br7hqa0zmgrm.lambda-url.eu-central-1.on.aws/';
let plansApiUrl = 'https://4kjp3ntfoc2hrpzxwy3pmea6fu0kfukt.lambda-url.eu-central-1.on.aws/';

try {
  const cdkOutputsPath = path.resolve(__dirname, '../../cdk-outputs.json');
  if (fs.existsSync(cdkOutputsPath)) {
    const cdkOutputs = JSON.parse(fs.readFileSync(cdkOutputsPath, 'utf-8'));
    chatApiUrl = cdkOutputs.PhotoScoutStack?.ChatApiUrl || chatApiUrl;
    conversationsApiUrl = cdkOutputs.PhotoScoutStack?.ConversationsApiUrl || conversationsApiUrl;
    plansApiUrl = cdkOutputs.PhotoScoutStack?.PlansApiUrl || plansApiUrl;
  }
} catch (e) {
  console.warn('Could not read cdk-outputs.json, using default Lambda URLs');
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/chat': {
        target: chatApiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('Proxying chat request to:', chatApiUrl);
          });
        },
      },
      '/api/conversations': {
        target: conversationsApiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/conversations/, ''),
      },
      '/api/plans': {
        target: plansApiUrl,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/plans/, ''),
      },
    },
  },
});
