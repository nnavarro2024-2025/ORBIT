import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building ORBIT for Vercel...');

// Build the client
console.log('Building client...');
execSync('cd client && npm run build', { stdio: 'inherit' });

// Build the server
console.log('Building server...');
execSync('npm run build:server', { stdio: 'inherit' });

// Copy client dist to root
console.log('Copying client build to root...');
if (fs.existsSync('dist/client')) {
  // Remove old client files from dist (but keep server bundle)
  fs.rmSync('dist/client', { recursive: true, force: true });
}
fs.cpSync('client/dist', 'dist/client', { recursive: true });

console.log('Build complete!');
