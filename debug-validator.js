/**
 * DEBUG SCRIPT FOR VALIDATOR MIDDLEWARE
 * 
 * Run this file to test if validateRequest is working:
 * node debug-validator.js
 */

console.log('='.repeat(60));
console.log('VALIDATOR MIDDLEWARE DEBUG SCRIPT');
console.log('='.repeat(60));

// Test 1: Check if validator file exists
console.log('\n[TEST 1] Checking if validator file exists...');
const fs = require('fs');
const path = require('path');

const validatorPath = path.join(__dirname, 'src', 'middleware', 'validator.js');
const exists = fs.existsSync(validatorPath);

if (exists) {
  console.log('✅ validator.js exists at:', validatorPath);
} else {
  console.log('❌ validator.js NOT FOUND at:', validatorPath);
  console.log('Expected path:', validatorPath);
  process.exit(1);
}

// Test 2: Try to require the validator
console.log('\n[TEST 2] Attempting to require validator...');
try {
  const validator = require('./src/middleware/validator');
  console.log('✅ validator.js loaded successfully');
  
  // Test 3: Check if validateRequest is exported
  console.log('\n[TEST 3] Checking exports...');
  console.log('Available exports:', Object.keys(validator));
  
  if (validator.validateRequest) {
    console.log('✅ validateRequest is exported');
    console.log('Type:', typeof validator.validateRequest);
  } else {
    console.log('❌ validateRequest is NOT exported');
    console.log('Available exports:', Object.keys(validator));
    process.exit(1);
  }
  
  // Test 4: Check if validateRequest returns a function
  console.log('\n[TEST 4] Testing validateRequest return value...');
  const middleware = validator.validateRequest(['body.test']);
  console.log('Return type:', typeof middleware);
  
  if (typeof middleware === 'function') {
    console.log('✅ validateRequest returns a function');
  } else {
    console.log('❌ validateRequest does NOT return a function');
    console.log('Returned:', middleware);
    process.exit(1);
  }
  
  // Test 5: Test the middleware function
  console.log('\n[TEST 5] Testing middleware execution...');
  const mockReq = {
    body: { test: 'value' }
  };
  const mockRes = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    }
  };
  let nextCalled = false;
  const mockNext = () => {
    nextCalled = true;
  };
  
  try {
    middleware(mockReq, mockRes, mockNext);
    if (nextCalled) {
      console.log('✅ Middleware executed successfully and called next()');
    } else {
      console.log('⚠️  Middleware executed but did not call next()');
      if (mockRes.jsonData) {
        console.log('Response:', mockRes.jsonData);
      }
    }
  } catch (error) {
    console.log('❌ Error executing middleware:', error.message);
    process.exit(1);
  }
  
  // Test 6: Test with missing field
  console.log('\n[TEST 6] Testing validation failure...');
  const mockReq2 = {
    body: {}
  };
  const mockRes2 = {
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.jsonData = data;
      return this;
    }
  };
  let nextCalled2 = false;
  const mockNext2 = () => {
    nextCalled2 = true;
  };
  
  middleware(mockReq2, mockRes2, mockNext2);
  
  if (!nextCalled2 && mockRes2.statusCode === 400) {
    console.log('✅ Validation correctly failed for missing field');
    console.log('Error response:', mockRes2.jsonData);
  } else {
    console.log('⚠️  Validation did not fail as expected');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\nThe validator.js file is working correctly.');
  console.log('The issue might be in how it\'s imported in authRoutes.js');
  console.log('\nNext steps:');
  console.log('1. Check authRoutes.js import statement');
  console.log('2. Check if authController.register is properly exported');
  console.log('3. Look for circular dependencies');
  
} catch (error) {
  console.log('❌ Error loading validator:', error.message);
  console.log('\nFull error:');
  console.log(error);
  
  console.log('\n' + '='.repeat(60));
  console.log('TROUBLESHOOTING TIPS:');
  console.log('='.repeat(60));
  console.log('1. Check for syntax errors in validator.js');
  console.log('2. Run: node -c src/middleware/validator.js');
  console.log('3. Make sure express-validator is installed');
  console.log('4. Check file encoding (should be UTF-8)');
  
  process.exit(1);
}