// Export all controllers
const authController = require('./authController');
const userController = require('./userController');
const workerController = require('./workerController');
const bookingController = require('./bookingController');
const reviewController = require('./reviewController');
const chatController = require('./chatController');
const notificationController = require('./notificationController');

const adminController = require('./adminController');


module.exports = {
  authController,
  userController,
  workerController,
  bookingController,
  reviewController,
  chatController,
  notificationController,
  
  adminController
  
};