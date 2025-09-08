import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building ORBIT for Vercel...');

// Build the client
console.log('Building client...');
execSync('cd client && npm run build', { stdio: 'inherit' });

// Copy client dist to root
console.log('Copying client build to root...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.cpSync('client/dist', 'dist', { recursive: true });

console.log('Build complete!');
