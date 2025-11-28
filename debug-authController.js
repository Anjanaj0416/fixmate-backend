/**
 * DEBUG SCRIPT FOR AUTH CONTROLLER
 * 
 * Run this file to test if authController.register exists:
 * node debug-authController.js
 */

console.log('='.repeat(60));
console.log('AUTH CONTROLLER DEBUG SCRIPT');
console.log('='.repeat(60));

// Test 1: Check if authController file exists
console.log('\n[TEST 1] Checking if authController file exists...');
const fs = require('path');
const path = require('path');

const controllerPath = path.join(__dirname, 'src', 'controllers', 'authController.js');

// Test 2: Try to require the authController
console.log('\n[TEST 2] Attempting to require authController...');
try {
  const authController = require('./src/controllers/authController');
  console.log('✅ authController.js loaded successfully');
  
  // Test 3: Check exports
  console.log('\n[TEST 3] Checking exports...');
  console.log('Available exports:', Object.keys(authController));
  
  // Test 4: Check specifically for register
  console.log('\n[TEST 4] Checking for register function...');
  if (authController.register) {
    console.log('✅ register function exists');
    console.log('Type:', typeof authController.register);
  } else {
    console.log('❌ register function NOT FOUND');
    console.log('\n⚠️  PROBLEM IDENTIFIED:');
    console.log('The authController does not export a "register" function.');
    console.log('This is why the server crashes!');
  }
  
  // Test 5: Check for login
  console.log('\n[TEST 5] Checking for login function...');
  if (authController.login) {
    console.log('✅ login function exists');
    console.log('Type:', typeof authController.login);
  } else {
    console.log('❌ login function NOT FOUND');
  }
  
  // Test 6: Check for other expected functions
  console.log('\n[TEST 6] Checking for other auth functions...');
  const expectedFunctions = [
    'register',
    'login',
    'logout',
    'verifyToken',
    'updateFCMToken',
    'forgotPassword',
    'verifyPhone',
    'deleteAccount'
  ];
  
  const missing = [];
  const present = [];
  
  expectedFunctions.forEach(func => {
    if (authController[func]) {
      present.push(func);
    } else {
      missing.push(func);
    }
  });
  
  console.log('\n✅ Present functions:', present);
  if (missing.length > 0) {
    console.log('❌ Missing functions:', missing);
  }
  
  console.log('\n' + '='.repeat(60));
  if (missing.length === 0) {
    console.log('✅ ALL AUTH FUNCTIONS PRESENT!');
  } else {
    console.log('❌ MISSING FUNCTIONS DETECTED!');
    console.log('\nYou need to add these functions to authController.js:');
    missing.forEach(func => {
      console.log(`  - exports.${func} = async (req, res, next) => { ... }`);
    });
  }
  console.log('='.repeat(60));
  
} catch (error) {
  console.log('❌ Error loading authController:', error.message);
  console.log('\nFull error:');
  console.log(error);
  
  console.log('\n' + '='.repeat(60));
  console.log('TROUBLESHOOTING TIPS:');
  console.log('='.repeat(60));
  console.log('1. Check for syntax errors in authController.js');
  console.log('2. Run: node -c src/controllers/authController.js');
  console.log('3. Make sure all required packages are installed');
  console.log('4. Check file encoding (should be UTF-8)');
  console.log('5. Look for circular dependencies');
  
  process.exit(1);
}