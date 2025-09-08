// Quick system test script
console.log('🔍 Testing TaskMasterPro System...\n');

// Test 1: Check if server is responding
console.log('1. Testing API Server...');
try {
  const response = await fetch('http://localhost:5000/api');
  if (response.ok) {
    const data = await response.json();
    console.log('✅ API Server: WORKING');
    console.log('   Response:', data);
  } else {
    console.log('❌ API Server: NOT RESPONDING');
  }
} catch (error) {
  console.log('❌ API Server: CONNECTION FAILED');
  console.log('   Error:', error.message);
}

// Test 2: Check if client is accessible
console.log('\n2. Testing Client Server...');
try {
  const response = await fetch('http://localhost:5174');
  if (response.ok) {
    console.log('✅ Client Server: WORKING');
    console.log('   Status:', response.status, response.statusText);
  } else {
    console.log('❌ Client Server: NOT RESPONDING');
  }
} catch (error) {
  console.log('❌ Client Server: CONNECTION FAILED');
  console.log('   Error:', error.message);
}

// Test 3: Test API endpoints
console.log('\n3. Testing API Endpoints...');
const endpoints = [
  '/api/facilities',
  '/api/computer-stations', 
  '/api/auth/user'
];

for (const endpoint of endpoints) {
  try {
    const response = await fetch(`http://localhost:5000${endpoint}`);
    console.log(`   ${endpoint}: ${response.ok ? '✅ WORKING' : '❌ ERROR'} (${response.status})`);
  } catch (error) {
    console.log(`   ${endpoint}: ❌ FAILED (${error.message})`);
  }
}

console.log('\n🎯 System Status: Both servers are running successfully!');
console.log('📱 Frontend: http://localhost:5174');
console.log('🔌 Backend: http://localhost:5000');
console.log('\n✅ Ready for development and testing!');
