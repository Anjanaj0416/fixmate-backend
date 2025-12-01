const { Booking, User, Worker, Customer, Quote, Notification } = require('../models');

/**
 * @desc    Create a new booking
 * @route   POST /api/bookings
 * @access  Private/Customer
 */
exports.createBooking = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      workerId,
      serviceType,
      problemDescription,
      problemImages,
      serviceLocation,
      scheduledDate,
      preferredTimeSlot,
      customerBudget,
      specialInstructions,
      urgency
    } = req.body;

    const customer = await User.findOne({ firebaseUid });

    const booking = await Booking.create({
      customerId: customer._id,
      workerId,
      serviceType,
      problemDescription,
      problemImages: problemImages || [],
      serviceLocation,
      scheduledDate,
      preferredTimeSlot,
      customerBudget,
      specialInstructions,
      urgency: urgency || 'medium'
    });

    // Update customer stats
    const customerProfile = await Customer.findOne({ userId: customer._id });
    await customerProfile.incrementBookings();

    // Send notification to worker
    await Notification.create({
      userId: workerId,
      type: 'booking-received',
      title: 'New Booking Request',
      message: `You have a new booking request for ${serviceType}`,
      relatedBooking: booking._id,
      relatedUser: customer._id
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings (with filters)
 * @route   GET /api/bookings
 * @access  Private
 */
exports.getBookings = async (req, res, next) => {
  try {
    const { firebaseUid, role } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const user = await User.findOne({ firebaseUid });

    const query = {};
    if (role === 'customer') {
      query.customerId = user._id;
    } else if (role === 'worker') {
      query.workerId = user._id;
    }

    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('customerId', 'fullName phoneNumber profileImage')
      .populate('workerId', 'fullName phoneNumber profileImage')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id)
      .populate('customerId', 'fullName phoneNumber email profileImage location')
      .populate('workerId', 'fullName phoneNumber email profileImage location');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update booking status
 * @route   PUT /api/bookings/:id/status
 * @access  Private
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { firebaseUid, role } = req.user;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify authorization
    if (role === 'customer' && booking.customerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (role === 'worker' && booking.workerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await booking.updateStatus(status, user._id, role);

    // Handle status-specific logic
    if (status === 'accepted') {
      // Notify customer
      await Notification.create({
        userId: booking.customerId,
        type: 'booking-accepted',
        title: 'Booking Accepted',
        message: 'Your booking request has been accepted',
        relatedBooking: booking._id,
        relatedUser: booking.workerId
      });

      // Update worker response
      booking.workerResponse = {
        respondedAt: new Date(),
        action: 'accepted'
      };
      await booking.save();
    } else if (status === 'completed') {
      // Update worker stats
      const worker = await Worker.findOne({ userId: booking.workerId });
      await worker.incrementCompletedJobs();

      // Update customer stats
      const customer = await Customer.findOne({ userId: booking.customerId });
      await customer.incrementBookings(true);

      // Notify customer
      await Notification.create({
        userId: booking.customerId,
        type: 'booking-completed',
        title: 'Job Completed',
        message: 'Your job has been marked as completed. Please leave a review.',
        relatedBooking: booking._id
      });
    }

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Worker accepts booking
 * @route   PUT /api/bookings/:id/accept
 * @access  Private/Worker
 */
exports.acceptBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.workerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    booking.status = 'accepted';
    booking.workerResponse = {
      respondedAt: new Date(),
      action: 'accepted'
    };
    await booking.save();

    // Notify customer
    await Notification.create({
      userId: booking.customerId,
      type: 'booking-accepted',
      title: 'Booking Accepted',
      message: 'Your booking has been accepted',
      relatedBooking: booking._id,
      relatedUser: user._id
    });

    res.status(200).json({
      success: true,
      message: 'Booking accepted successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Worker declines booking
 * @route   PUT /api/bookings/:id/decline
 * @access  Private/Worker
 */
exports.declineBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (booking.workerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    booking.status = 'cancelled';
    booking.workerResponse = {
      respondedAt: new Date(),
      action: 'declined',
      declineReason: reason
    };
    booking.cancelledBy = 'worker';
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save();

    // Notify customer
    await Notification.create({
      userId: booking.customerId,
      type: 'booking-declined',
      title: 'Booking Declined',
      message: `Your booking was declined. Reason: ${reason}`,
      relatedBooking: booking._id
    });

    res.status(200).json({
      success: true,
      message: 'Booking declined',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel booking
 * @route   PUT /api/bookings/:id/cancel
 * @access  Private
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { firebaseUid, role } = req.user;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify authorization
    const isAuthorized = (
      (role === 'customer' && booking.customerId.toString() === user._id.toString()) ||
      (role === 'worker' && booking.workerId.toString() === user._id.toString())
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    booking.status = 'cancelled';
    booking.cancelledBy = role;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason;
    await booking.save();

    // Update customer stats
    const customer = await Customer.findOne({ userId: booking.customerId });
    await customer.incrementBookings(false, true);

    // Notify the other party
    const notifyUserId = role === 'customer' ? booking.workerId : booking.customerId;
    await Notification.create({
      userId: notifyUserId,
      type: 'booking-cancelled',
      title: 'Booking Cancelled',
      message: `A booking has been cancelled. Reason: ${reason}`,
      relatedBooking: booking._id
    });

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: { booking }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create quote for booking
 * @route   POST /api/bookings/:id/quote
 * @access  Private/Worker
 */
exports.createQuote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const {
      totalAmount,
      breakdown,
      notes,
      validUntil,
      estimatedDuration
    } = req.body;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.workerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const quote = await Quote.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      workerId: user._id,
      serviceType: booking.serviceType,
      totalAmount,
      breakdown,
      notes,
      validUntil,
      estimatedDuration
    });

    // Update booking
    booking.status = 'quoted';
    booking.quote = {
      amount: totalAmount,
      breakdown,
      validUntil,
      notes,
      createdAt: new Date(),
      status: 'pending'
    };
    await booking.save();

    // Notify customer
    await Notification.create({
      userId: booking.customerId,
      type: 'quote-received',
      title: 'Quote Received',
      message: `You received a quote of LKR ${totalAmount} for your booking`,
      relatedBooking: booking._id,
      relatedUser: user._id
    });

    res.status(201).json({
      success: true,
      message: 'Quote created successfully',
      data: { quote }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update work progress
 * @route   POST /api/bookings/:id/progress
 * @access  Private/Worker
 */
exports.updateWorkProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, images } = req.body;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });
    const booking = await Booking.findById(id);

    if (booking.workerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    booking.workProgress.push({
      status,
      note,
      images: images || [],
      timestamp: new Date()
    });

    await booking.save();

    // Notify customer
    await Notification.create({
      userId: booking.customerId,
      type: 'booking-update',
      title: 'Work Progress Update',
      message: `Your booking has been updated: ${status}`,
      relatedBooking: booking._id
    });

    res.status(200).json({
      success: true,
      message: 'Work progress updated successfully',
      data: { workProgress: booking.workProgress }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking statistics
 * @route   GET /api/bookings/stats
 * @access  Private
 */
exports.getBookingStats = async (req, res, next) => {
  try {
    const { firebaseUid, role } = req.user;
    const user = await User.findOne({ firebaseUid });

    const query = {};
    if (role === 'customer') {
      query.customerId = user._id;
    } else if (role === 'worker') {
      query.workerId = user._id;
    }

    const stats = {
      total: await Booking.countDocuments(query),
      pending: await Booking.countDocuments({ ...query, status: 'pending' }),
      accepted: await Booking.countDocuments({ ...query, status: 'accepted' }),
      inProgress: await Booking.countDocuments({ ...query, status: 'in-progress' }),
      completed: await Booking.countDocuments({ ...query, status: 'completed' }),
      cancelled: await Booking.countDocuments({ ...query, status: 'cancelled' })
    };

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};
/**
 * Quote Request Controller
 * Handles creation and management of quote requests
 * Add these methods to your existing bookingController.js
 */

/**
 * @desc    Create a new quote request
 * @route   POST /api/v1/bookings/quote-request
 * @access  Private/Customer
 */
exports.createQuoteRequest = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      serviceType,
      problemDescription,
      issueLocation,
      serviceDate,
      urgency,
      budgetRange,
      problemImages,
      customerLocation,
      contactPhone
    } = req.body;

    // Find customer
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const customer = await Customer.findOne({ userId: user._id });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer profile not found'
      });
    }

    // Create quote request (as a booking with status 'quote_requested')
    const quoteRequest = await Booking.create({
      customerId: user._id,
      serviceType,
      problemDescription,
      issueLocation,
      serviceLocation: customerLocation,
      scheduledDate: serviceDate,
      urgency: urgency || 'normal',
      customerBudget: budgetRange,
      problemImages: problemImages || [],
      contactPhone,
      status: 'quote_requested',
      paymentStatus: 'pending'
    });

    console.log('✅ Quote request created:', {
      quoteRequestId: quoteRequest._id,
      serviceType,
      issueLocation,
      budgetRange
    });

    res.status(201).json({
      success: true,
      message: 'Quote request created successfully',
      quoteRequest
    });

  } catch (error) {
    console.error('❌ Error creating quote request:', error);
    next(error);
  }
};

/**
 * @desc    Send quote request to selected workers
 * @route   POST /api/v1/bookings/:id/send-to-workers
 * @access  Private/Customer
 */
exports.sendQuoteToWorkers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { workerIds } = req.body;
    const { firebaseUid } = req.user;

    if (!workerIds || workerIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one worker'
      });
    }

    // Find quote request
    const quoteRequest = await Booking.findById(id).populate('customerId', 'fullName email');
    
    if (!quoteRequest) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    // Verify customer owns this quote request
    const user = await User.findOne({ firebaseUid });
    if (quoteRequest.customerId._id.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Create separate booking for each worker
    const bookings = [];
    const notifications = [];

    for (const workerId of workerIds) {
      // Create a copy of the quote request for this worker
      const booking = await Booking.create({
        customerId: quoteRequest.customerId._id,
        workerId,
        serviceType: quoteRequest.serviceType,
        problemDescription: quoteRequest.problemDescription,
        issueLocation: quoteRequest.issueLocation,
        serviceLocation: quoteRequest.serviceLocation,
        scheduledDate: quoteRequest.scheduledDate,
        urgency: quoteRequest.urgency,
        customerBudget: quoteRequest.customerBudget,
        problemImages: quoteRequest.problemImages,
        contactPhone: quoteRequest.contactPhone,
        status: 'pending', // Worker needs to respond
        paymentStatus: 'pending',
        quoteRequestId: quoteRequest._id
      });

      bookings.push(booking);

      // Create notification for worker
      const notification = await Notification.create({
        userId: workerId,
        type: 'booking-received',
        title: 'New Quote Request',
        message: `You have received a new quote request for ${quoteRequest.serviceType}`,
        relatedBooking: booking._id,
        relatedUser: user._id
      });

      notifications.push(notification);
    }

    // Update original quote request status
    quoteRequest.status = 'quotes_sent';
    quoteRequest.sentToWorkers = workerIds;
    await quoteRequest.save();

    // Update customer stats
    const customerProfile = await Customer.findOne({ userId: user._id });
    if (customerProfile) {
      await customerProfile.incrementBookings();
    }

    console.log('✅ Quote requests sent:', {
      quoteRequestId: quoteRequest._id,
      workersCount: workerIds.length,
      bookingIds: bookings.map(b => b._id)
    });

    res.status(200).json({
      success: true,
      message: `Quote request sent to ${workerIds.length} worker(s)`,
      bookings,
      quoteRequest
    });

  } catch (error) {
    console.error('❌ Error sending quote to workers:', error);
    next(error);
  }
};

/**
 * @desc    Get customer's quote requests
 * @route   GET /api/v1/bookings/my-quotes
 * @access  Private/Customer
 */
exports.getCustomerQuoteRequests = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { page = 1, limit = 20, status } = req.query;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const query = { customerId: user._id };
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    } else {
      // By default, show quote-related statuses
      query.status = { 
        $in: ['quote_requested', 'quotes_sent', 'pending', 'accepted', 'declined'] 
      };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const quoteRequests = await Booking.find(query)
      .populate('workerId', 'userId serviceCategories specializations rating hourlyRate location')
      .populate({
        path: 'workerId',
        populate: {
          path: 'userId',
          select: 'fullName email phoneNumber profileImage'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    // Group quotes by original request
    const groupedQuotes = {};
    quoteRequests.forEach(quote => {
      const requestId = quote.quoteRequestId || quote._id;
      if (!groupedQuotes[requestId]) {
        groupedQuotes[requestId] = {
          requestInfo: quote,
          responses: []
        };
      }
      if (quote.workerId) {
        groupedQuotes[requestId].responses.push(quote);
      }
    });

    res.status(200).json({
      success: true,
      count: quoteRequests.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      quoteRequests,
      groupedQuotes
    });

  } catch (error) {
    console.error('❌ Error fetching quote requests:', error);
    next(error);
  }
};

/**
 * @desc    Get worker's received quote requests
 * @route   GET /api/v1/bookings/received-quotes
 * @access  Private/Worker
 */
exports.getWorkerReceivedQuotes = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { page = 1, limit = 20, status } = req.query;

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const worker = await Worker.findOne({ userId: user._id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    const query = { 
      workerId: worker._id,
      status: status || { $in: ['pending', 'accepted', 'declined'] }
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const receivedQuotes = await Booking.find(query)
      .populate('customerId', 'fullName email phoneNumber profileImage location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: receivedQuotes.length,
      total,
      pages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      receivedQuotes
    });

  } catch (error) {
    console.error('❌ Error fetching received quotes:', error);
    next(error);
  }
};

/**
 * @desc    Worker responds to quote request (accept/decline)
 * @route   PUT /api/v1/bookings/:id/respond
 * @access  Private/Worker
 */
exports.respondToQuoteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { response, quoteAmount, quoteDetails, declineReason } = req.body;
    const { firebaseUid } = req.user;

    if (!['accept', 'decline'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Must be "accept" or "decline"'
      });
    }

    const booking = await Booking.findById(id)
      .populate('customerId', 'fullName email')
      .populate('workerId');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Quote request not found'
      });
    }

    // Verify worker owns this booking
    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOne({ userId: user._id });
    
    if (booking.workerId._id.toString() !== worker._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    if (response === 'accept') {
      if (!quoteAmount || !quoteDetails) {
        return res.status(400).json({
          success: false,
          message: 'Quote amount and details are required'
        });
      }

      booking.status = 'accepted';
      booking.quote = {
        amount: quoteAmount,
        details: quoteDetails,
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      };

      // Notify customer
      await Notification.create({
        userId: booking.customerId._id,
        type: 'quote-received',
        title: 'Quote Received',
        message: `${worker.userId.fullName} has sent you a quote for LKR ${quoteAmount}`,
        relatedBooking: booking._id,
        relatedUser: worker.userId._id
      });

    } else {
      booking.status = 'declined';
      booking.declineReason = declineReason || 'Worker declined the request';
      
      // Notify customer
      await Notification.create({
        userId: booking.customerId._id,
        type: 'booking-declined',
        title: 'Quote Request Declined',
        message: `${worker.userId.fullName} declined your quote request`,
        relatedBooking: booking._id,
        relatedUser: worker.userId._id
      });
    }

    await booking.save();

    console.log('✅ Worker responded to quote:', {
      bookingId: booking._id,
      response,
      quoteAmount
    });

    res.status(200).json({
      success: true,
      message: `Quote request ${response}ed successfully`,
      booking
    });

  } catch (error) {
    console.error('❌ Error responding to quote:', error);
    next(error);
  }
};