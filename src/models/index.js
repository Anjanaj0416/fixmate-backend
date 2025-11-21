/**
 * Models Index
 * Central export point for all Mongoose models
 */

const User = require('./User');
const Worker = require('./Worker');
const Customer = require('./Customer');
const Booking = require('./Booking');
const Review = require('./Review');
const Message = require('./Message');
const Conversation = require('./Conversation');
const Notification = require('./Notification');
const Payment = require('./Payment');
const Quote = require('./Quote');
const Category = require('./Category');
const ProblemImage = require('./ProblemImage');

module.exports = {
  User,
  Worker,
  Customer,
  Booking,
  Review,
  Message,
  Conversation,
  Notification,
  Payment,
  Quote,
  Category,
  ProblemImage
};