// Export all controllers
const authController = require('./authController');
const userController = require('./userController');
const workerController = require('./workerController');
const bookingController = require('./bookingController');
const reviewController = require('./reviewController');
const chatController = require('./chatController');
const notificationController = require('./notificationController');
const paymentController = require('./paymentController');
const adminController = require('./adminController');
const aiController = require('./aiController');

module.exports = {
  authController,
  userController,
  workerController,
  bookingController,
  reviewController,
  chatController,
  notificationController,
  paymentController,
  adminController,
  aiController
};