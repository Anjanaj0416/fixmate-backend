const { Payment, Booking, Worker, Notification } = require('../models');

/**
 * @desc    Create payment
 * @route   POST /api/payments
 * @access  Private
 */
exports.createPayment = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      bookingId,
      amount,
      paymentMethod,
      platformFeePercentage = 10
    } = req.body;

    const customer = await require('../models/User').findOne({ firebaseUid });
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Calculate platform fee and worker earnings
    const platformFeeAmount = (amount * platformFeePercentage) / 100;
    const workerEarnings = amount - platformFeeAmount;

    const payment = await Payment.create({
      bookingId,
      customerId: customer._id,
      workerId: booking.workerId,
      amount,
      platformFee: {
        amount: platformFeeAmount,
        percentage: platformFeePercentage
      },
      workerEarnings,
      paymentMethod,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment by ID
 * @route   GET /api/payments/:id
 * @access  Private
 */
exports.getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const payment = await Payment.findById(id)
      .populate('customerId', 'fullName email phoneNumber')
      .populate('workerId', 'fullName email phoneNumber')
      .populate('bookingId', 'serviceType scheduledDate');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all payments for user
 * @route   GET /api/payments
 * @access  Private
 */
exports.getPayments = async (req, res, next) => {
  try {
    const { firebaseUid, role } = req.user;
    const { status, page = 1, limit = 20 } = req.query;

    const user = await require('../models/User').findOne({ firebaseUid });

    const query = {};
    if (role === 'customer') {
      query.customerId = user._id;
    } else if (role === 'worker') {
      query.workerId = user._id;
    }

    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate('bookingId', 'serviceType scheduledDate')
      .populate('customerId', 'fullName')
      .populate('workerId', 'fullName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Payment.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        payments,
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
 * @desc    Confirm payment (mark as completed)
 * @route   PUT /api/payments/:id/confirm
 * @access  Private/Customer
 */
exports.confirmPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { transactionId, paymentDetails } = req.body;

    const customer = await require('../models/User').findOne({ firebaseUid });
    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Update payment
    payment.status = 'completed';
    payment.completedAt = new Date();
    if (transactionId) payment.externalTransactionId = transactionId;
    if (paymentDetails) payment.paymentDetails = paymentDetails;

    await payment.save();

    // Update booking payment status
    await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: 'paid',
      'paymentDetails.paidAt': payment.completedAt,
      'paymentDetails.transactionId': payment.transactionId,
      'paymentDetails.amount': payment.amount
    });

    // Update worker earnings
    const worker = await Worker.findOne({ userId: payment.workerId });
    if (worker) {
      worker.totalEarnings += payment.workerEarnings;
      await worker.save();
    }

    // Notify worker
    await Notification.create({
      userId: payment.workerId,
      type: 'payment-received',
      title: 'Payment Received',
      message: `You received a payment of LKR ${payment.workerEarnings}`,
      relatedBooking: payment.bookingId
    });

    res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request refund
 * @route   POST /api/payments/:id/refund
 * @access  Private
 */
exports.requestRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { reason, amount } = req.body;

    const user = await require('../models/User').findOne({ firebaseUid });
    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.customerId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only refund completed payments'
      });
    }

    await payment.processRefund(amount || payment.amount, reason, user._id);

    res.status(200).json({
      success: true,
      message: 'Refund request submitted successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get earnings statistics (Worker)
 * @route   GET /api/payments/earnings
 * @access  Private/Worker
 */
exports.getEarnings = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { startDate, endDate } = req.query;

    const worker = await require('../models/User').findOne({ firebaseUid });

    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1)); // Start of month
    const end = endDate ? new Date(endDate) : new Date(); // Today

    const earnings = await Payment.getTotalEarnings(worker._id, start, end);

    // Get earnings by month
    const monthlyEarnings = await Payment.aggregate([
      {
        $match: {
          workerId: worker._id,
          status: 'completed',
          completedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          totalEarnings: { $sum: '$workerEarnings' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEarnings: earnings.totalEarnings,
        totalTransactions: earnings.totalTransactions,
        monthlyEarnings
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment statistics
 * @route   GET /api/payments/stats
 * @access  Private
 */
exports.getPaymentStats = async (req, res, next) => {
  try {
    const { firebaseUid, role } = req.user;
    const user = await require('../models/User').findOne({ firebaseUid });

    const query = {};
    if (role === 'customer') {
      query.customerId = user._id;
    } else if (role === 'worker') {
      query.workerId = user._id;
    }

    const stats = {
      total: await Payment.countDocuments(query),
      pending: await Payment.countDocuments({ ...query, status: 'pending' }),
      completed: await Payment.countDocuments({ ...query, status: 'completed' }),
      failed: await Payment.countDocuments({ ...query, status: 'failed' }),
      refunded: await Payment.countDocuments({ ...query, status: 'refunded' })
    };

    // Calculate total amount
    const totalAmount = await Payment.aggregate([
      {
        $match: {
          ...query,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: role === 'customer' ? '$amount' : '$workerEarnings' }
        }
      }
    ]);

    stats.totalAmount = totalAmount[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Initiate payout to worker (Admin)
 * @route   POST /api/payments/:id/payout
 * @access  Private/Admin
 */
exports.initiatePayout = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payoutTransactionId } = req.body;

    const payment = await Payment.findById(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.workerPayoutDetails.payoutStatus = 'completed';
    payment.workerPayoutDetails.payoutDate = new Date();
    payment.workerPayoutDetails.payoutTransactionId = payoutTransactionId;

    await payment.save();

    res.status(200).json({
      success: true,
      message: 'Payout initiated successfully',
      data: { payment }
    });
  } catch (error) {
    next(error);
  }
};