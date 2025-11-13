const { execSync } = require('child_process');
const fs = require('fs');

try {
  console.log('Checking syntax...');
  const result = execSync('npx tsc --noEmit --skipLibCheck src/app/(app)/admin/page.tsx', {
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log('✅ Syntax check passed');
} catch (error) {
  console.log('❌ Syntax errors found:');
  console.log(error.stdout);
}
