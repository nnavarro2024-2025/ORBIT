#!/usr/bin/env node
/**
 * Comprehensive System Test for TaskMasterPro
 * Tests all critical components and functionality
 */

import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

// Test configuration
const LOCAL_CLIENT = 'http://localhost:5173';
const LOCAL_CLIENT_ALT = 'http://localhost:5174';
const LOCAL_SERVER = 'http://localhost:5000';

class SystemTester {
  constructor() {
    this.results = [];
    this.errors = [];
  }

  async testFileExists(filePath, description) {
    try {
      const fullPath = join(__dirname, '..', filePath);
      await readFile(fullPath, 'utf-8');
      log(colors.green, `✅ ${description}: EXISTS`);
      this.results.push({ test: description, status: 'PASS', type: 'file' });
      return true;
    } catch (error) {
      log(colors.red, `❌ ${description}: MISSING`);
      this.results.push({ test: description, status: 'FAIL', type: 'file', error: error.message });
      return false;
    }
  }

  async testEndpoint(url, description, expectedStatus = 200) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.status === expectedStatus) {
        log(colors.green, `✅ ${description}: RESPONSIVE (${response.status})`);
        this.results.push({ test: description, status: 'PASS', type: 'endpoint' });
        return true;
      } else {
        throw new Error(`Expected ${expectedStatus}, got ${response.status}`);
      }
    } catch (error) {
      log(colors.red, `❌ ${description}: ${error.message}`);
      this.results.push({ test: description, status: 'FAIL', type: 'endpoint', error: error.message });
      return false;
    }
  }

  async testBuildOutput() {
    log(colors.blue, '\n🏗️  Testing Build Output...');
    
    const buildTests = [
      ['dist/index.html', 'Client Build - HTML'],
      ['dist/assets', 'Client Build - Assets'],
      ['package.json', 'Root Package Config'],
      ['client/package.json', 'Client Package Config'],
      ['vercel.json', 'Vercel Configuration'],
      ['vite.config.vercel.ts', 'Vercel Build Config']
    ];

    for (const [path, desc] of buildTests) {
      await this.testFileExists(path, desc);
    }
  }

  async testCriticalFiles() {
    log(colors.blue, '\n📁 Testing Critical Files...');
    
    const criticalFiles = [
      ['server/index.ts', 'Server Entry Point'],
      ['server/routes.ts', 'Server Routes'],
      ['server/db.ts', 'Database Configuration'],
      ['server/db-vercel.ts', 'Vercel Database Config'],
      ['client/src/App.tsx', 'React App Component'],
      ['client/src/main.tsx', 'React Entry Point'],
      ['client/src/lib/api.ts', 'API Client'],
      ['client/src/lib/supabase.ts', 'Supabase Client'],
      ['client/src/hooks/useAuth.ts', 'Authentication Hook'],
      ['api/index.ts', 'API Index'],
      ['api/facilities.ts', 'Facilities API'],
      ['api/computer-stations.ts', 'Computer Stations API'],
      ['api/auth/user.ts', 'Auth API'],
      ['shared/schema.ts', 'Database Schema']
    ];

    for (const [path, desc] of criticalFiles) {
      await this.testFileExists(path, desc);
    }
  }

  async testServerEndpoints() {
    log(colors.blue, '\n🌐 Testing Server Endpoints...');
    
    const endpoints = [
      [`${LOCAL_SERVER}/api`, 'Main API Info'],
      [`${LOCAL_SERVER}/api/test`, 'Test Endpoint'],
      [`${LOCAL_SERVER}/api/facilities`, 'Facilities API']
    ];

    for (const [url, desc] of endpoints) {
      await this.testEndpoint(url, desc);
    }
  }

  async testClientServer() {
    log(colors.blue, '\n💻 Testing Client Server...');
    
    const clientEndpoints = [
      [LOCAL_CLIENT, 'Primary Client Server'],
      [LOCAL_CLIENT_ALT, 'Alternative Client Server']
    ];

    let clientWorking = false;
    for (const [url, desc] of clientEndpoints) {
      const result = await this.testEndpoint(url, desc);
      if (result) clientWorking = true;
    }

    return clientWorking;
  }

  async testEnvironmentFiles() {
    log(colors.blue, '\n🔧 Testing Environment Configuration...');
    
    const envTests = [
      ['.env', 'Development Environment'],
      ['.env.example', 'Environment Template'],
      ['.env.production.example', 'Production Template']
    ];

    for (const [path, desc] of envTests) {
      await this.testFileExists(path, desc);
    }
  }

  async runFullSystemTest() {
    log(colors.blue, '🚀 TaskMasterPro - Comprehensive System Test\n');
    
    // Test all components
    await this.testCriticalFiles();
    await this.testBuildOutput();
    await this.testEnvironmentFiles();
    await this.testClientServer();
    await this.testServerEndpoints();
    
    // Generate report
    this.generateReport();
  }

  generateReport() {
    log(colors.blue, '\n📊 System Test Report');
    log(colors.blue, '='.repeat(50));
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const total = this.results.length;
    
    log(colors.green, `✅ Tests Passed: ${passed}/${total}`);
    if (failed > 0) {
      log(colors.red, `❌ Tests Failed: ${failed}/${total}`);
    }
    
    // Show failed tests
    const failures = this.results.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
      log(colors.red, '\n❌ Failed Tests:');
      failures.forEach(failure => {
        log(colors.red, `   ${failure.test}: ${failure.error || 'FAILED'}`);
      });
    }
    
    // System status
    const systemStatus = failed === 0 ? 'FULLY OPERATIONAL' : 
                        failed <= 3 ? 'MOSTLY OPERATIONAL' : 
                        'NEEDS ATTENTION';
    
    const statusColor = failed === 0 ? colors.green : 
                       failed <= 3 ? colors.yellow : colors.red;
    
    log(statusColor, `\n🎯 System Status: ${systemStatus}`);
    
    // Recommendations
    log(colors.blue, '\n📝 Recommendations:');
    if (failed === 0) {
      log(colors.green, '   ✅ System is ready for deployment!');
      log(colors.green, '   ✅ All critical components are functional');
      log(colors.green, '   ✅ Both local development and production builds working');
    } else {
      log(colors.yellow, '   ⚠️  Fix failed tests before deployment');
      if (failures.some(f => f.type === 'endpoint')) {
        log(colors.yellow, '   ⚠️  Server connectivity issues detected');
      }
      if (failures.some(f => f.type === 'file')) {
        log(colors.yellow, '   ⚠️  Missing critical files detected');
      }
    }
  }
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SystemTester();
  await tester.runFullSystemTest();
  
  // Exit with appropriate code
  const hasFailures = tester.results.some(r => r.status === 'FAIL');
  process.exit(hasFailures ? 1 : 0);
}
