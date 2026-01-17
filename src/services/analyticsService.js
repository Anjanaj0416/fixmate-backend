const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const Review = require('../models/Review');

const logger = require('../utils/logger');

/**
 * Analytics Service
 * Handles analytics, statistics, and reporting operations
 */

class AnalyticsService {
  /**
   * Get dashboard statistics for admin
   */
  async getAdminDashboardStats() {
    try {
      const [
        totalUsers,
        totalWorkers,
        totalCustomers,
        totalBookings,
        totalRevenue,
        activeWorkers,
        pendingBookings,
        completedBookings
      ] = await Promise.all([
        User.countDocuments({ role: { $in: ['customer', 'worker'] } }),
        Worker.countDocuments(),
        Customer.countDocuments(),
        Booking.countDocuments(),
        this.getTotalRevenue(),
        Worker.countDocuments({ 'profile.isAvailable': true }),
        Booking.countDocuments({ status: 'pending' }),
        Booking.countDocuments({ status: 'completed' })
      ]);

      logger.info('Admin dashboard stats retrieved successfully');

      return {
        users: {
          total: totalUsers,
          workers: totalWorkers,
          customers: totalCustomers
        },
        workers: {
          total: totalWorkers,
          active: activeWorkers,
          inactivePercentage: ((totalWorkers - activeWorkers) / totalWorkers * 100).toFixed(2)
        },
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          completed: completedBookings,
          completionRate: (completedBookings / totalBookings * 100).toFixed(2)
        },
        revenue: {
          total: totalRevenue,
          averagePerBooking: (totalRevenue / totalBookings).toFixed(2)
        }
      };
    } catch (error) {
      logger.error(`Error getting admin dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get worker dashboard statistics
   */
  async getWorkerDashboardStats(workerId) {
    try {
      const [
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalEarnings,
        averageRating,
        totalReviews,
        pendingBookings
      ] = await Promise.all([
        Booking.countDocuments({ workerId }),
        Booking.countDocuments({ workerId, status: 'completed' }),
        Booking.countDocuments({ workerId, status: 'cancelled' }),
        this.getWorkerEarnings(workerId),
        this.getWorkerAverageRating(workerId),
        Review.countDocuments({ workerId }),
        Booking.countDocuments({ workerId, status: 'pending' })
      ]);

      const thisMonthEarnings = await this.getWorkerEarningsForPeriod(
        workerId,
        new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        new Date()
      );

      logger.info(`Worker dashboard stats retrieved for: ${workerId}`);

      return {
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          pending: pendingBookings,
          cancelled: cancelledBookings,
          completionRate: (completedBookings / totalBookings * 100).toFixed(2)
        },
        earnings: {
          total: totalEarnings,
          thisMonth: thisMonthEarnings,
          averagePerBooking: (totalEarnings / completedBookings).toFixed(2)
        },
        reputation: {
          averageRating,
          totalReviews,
          ratingPercentage: (averageRating / 5 * 100).toFixed(2)
        }
      };
    } catch (error) {
      logger.error(`Error getting worker dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get customer dashboard statistics
   */
  async getCustomerDashboardStats(customerId) {
    try {
      const [
        totalBookings,
        completedBookings,
        cancelledBookings,
        totalSpent,
        favoriteWorkers,
        pendingBookings
      ] = await Promise.all([
        Booking.countDocuments({ customerId }),
        Booking.countDocuments({ customerId, status: 'completed' }),
        Booking.countDocuments({ customerId, status: 'cancelled' }),
        this.getCustomerTotalSpent(customerId),
        Customer.findOne({ userId: customerId }).select('favorites').lean(),
        Booking.countDocuments({ customerId, status: 'pending' })
      ]);

      logger.info(`Customer dashboard stats retrieved for: ${customerId}`);

      return {
        bookings: {
          total: totalBookings,
          completed: completedBookings,
          pending: pendingBookings,
          cancelled: cancelledBookings
        },
        spending: {
          total: totalSpent,
          averagePerBooking: totalBookings > 0 ? (totalSpent / totalBookings).toFixed(2) : 0
        },
        favorites: {
          count: favoriteWorkers?.favorites?.length || 0
        }
      };
    } catch (error) {
      logger.error(`Error getting customer dashboard stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get booking statistics by date range
   */
  async getBookingStatsByDateRange(startDate, endDate) {
    try {
      const bookings = await Booking.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      // Transform data for easier consumption
      const statsMap = {};
      bookings.forEach(item => {
        const date = item._id.date;
        if (!statsMap[date]) {
          statsMap[date] = {
            date,
            total: 0,
            completed: 0,
            pending: 0,
            cancelled: 0,
            in_progress: 0
          };
        }
        statsMap[date][item._id.status] = item.count;
        statsMap[date].total += item.count;
      });

      const stats = Object.values(statsMap);

      logger.info(`Booking stats retrieved for ${startDate} to ${endDate}`);

      return stats;
    } catch (error) {
      logger.error(`Error getting booking stats by date range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get revenue statistics by period
   */
  async getRevenueStatsByPeriod(period = 'month') {
    try {
      let groupBy;
      
      switch (period) {
        case 'day':
          groupBy = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          break;
        case 'week':
          groupBy = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
          break;
        case 'month':
          groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          break;
        case 'year':
          groupBy = { $dateToString: { format: '%Y', date: '$createdAt' } };
          break;
        default:
          groupBy = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
      }

      const revenue = await Payment.aggregate([
        {
          $match: {
            status: 'completed'
          }
        },
        {
          $group: {
            _id: groupBy,
            totalRevenue: { $sum: '$amount' },
            platformFee: { $sum: '$platformFee' },
            workerEarnings: { $sum: '$workerAmount' },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]);

      logger.info(`Revenue stats retrieved for period: ${period}`);

      return revenue.map(item => ({
        period: item._id,
        revenue: item.totalRevenue.toFixed(2),
        platformFee: item.platformFee.toFixed(2),
        workerEarnings: item.workerEarnings.toFixed(2),
        transactions: item.transactionCount
      }));
    } catch (error) {
      logger.error(`Error getting revenue stats by period: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get service category statistics
   */
  async getServiceCategoryStats() {
    try {
      const stats = await Booking.aggregate([
        {
          $group: {
            _id: '$serviceType',
            totalBookings: { $sum: 1 },
            completedBookings: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            averageRating: { $avg: '$rating' }
          }
        },
        {
          $sort: { totalBookings: -1 }
        }
      ]);

      logger.info('Service category stats retrieved');

      return stats.map(item => ({
        category: item._id,
        bookings: item.totalBookings,
        completed: item.completedBookings,
        completionRate: (item.completedBookings / item.totalBookings * 100).toFixed(2),
        averageRating: item.averageRating ? item.averageRating.toFixed(2) : 0
      }));
    } catch (error) {
      logger.error(`Error getting service category stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get top performing workers
   */
  async getTopWorkers(limit = 10) {
    try {
      const workers = await Worker.find({
        'profile.isVerified': true
      })
        .select('userId profile ratings')
        .sort({ 'ratings.average': -1, 'ratings.count': -1 })
        .limit(limit)
        .lean();

      const workersWithEarnings = await Promise.all(
        workers.map(async (worker) => {
          const earnings = await this.getWorkerEarnings(worker.userId);
          const completedBookings = await Booking.countDocuments({
            workerId: worker.userId,
            status: 'completed'
          });

          return {
            workerId: worker.userId,
            name: worker.profile.businessName,
            specialization: worker.profile.specialization,
            rating: worker.ratings.average,
            reviewCount: worker.ratings.count,
            completedBookings,
            totalEarnings: earnings
          };
        })
      );

      logger.info(`Top ${limit} workers retrieved`);

      return workersWithEarnings;
    } catch (error) {
      logger.error(`Error getting top workers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get platform growth metrics
   */
  async getGrowthMetrics() {
    try {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        usersThisMonth,
        usersLastMonth,
        bookingsThisMonth,
        bookingsLastMonth,
        revenueThisMonth,
        revenueLastMonth
      ] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: thisMonth } }),
        User.countDocuments({ 
          createdAt: { $gte: lastMonth, $lt: thisMonth }
        }),
        Booking.countDocuments({ createdAt: { $gte: thisMonth } }),
        Booking.countDocuments({ 
          createdAt: { $gte: lastMonth, $lt: thisMonth }
        }),
        this.getRevenueForPeriod(thisMonth, now),
        this.getRevenueForPeriod(lastMonth, thisMonth)
      ]);

      const calculateGrowth = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return (((current - previous) / previous) * 100).toFixed(2);
      };

      logger.info('Growth metrics retrieved');

      return {
        users: {
          current: usersThisMonth,
          previous: usersLastMonth,
          growth: calculateGrowth(usersThisMonth, usersLastMonth)
        },
        bookings: {
          current: bookingsThisMonth,
          previous: bookingsLastMonth,
          growth: calculateGrowth(bookingsThisMonth, bookingsLastMonth)
        },
        revenue: {
          current: revenueThisMonth.toFixed(2),
          previous: revenueLastMonth.toFixed(2),
          growth: calculateGrowth(revenueThisMonth, revenueLastMonth)
        }
      };
    } catch (error) {
      logger.error(`Error getting growth metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics() {
    try {
      const [
        activeUsers,
        totalUsers,
        averageBookingsPerUser,
        returnCustomerRate
      ] = await Promise.all([
        this.getActiveUserCount(),
        User.countDocuments(),
        this.getAverageBookingsPerUser(),
        this.getReturnCustomerRate()
      ]);

      logger.info('User engagement metrics retrieved');

      return {
        activeUsers,
        totalUsers,
        engagementRate: (activeUsers / totalUsers * 100).toFixed(2),
        averageBookingsPerUser: averageBookingsPerUser.toFixed(2),
        returnCustomerRate: returnCustomerRate.toFixed(2)
      };
    } catch (error) {
      logger.error(`Error getting user engagement metrics: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get worker performance report
   */
  async getWorkerPerformanceReport(workerId, startDate, endDate) {
    try {
      const bookings = await Booking.find({
        workerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).lean();

      const reviews = await Review.find({
        workerId,
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }).lean();

      const earnings = await this.getWorkerEarningsForPeriod(
        workerId,
        new Date(startDate),
        new Date(endDate)
      );

      const stats = {
        bookings: {
          total: bookings.length,
          completed: bookings.filter(b => b.status === 'completed').length,
          cancelled: bookings.filter(b => b.status === 'cancelled').length,
          pending: bookings.filter(b => b.status === 'pending').length
        },
        earnings: {
          total: earnings,
          averagePerBooking: bookings.length > 0 ? (earnings / bookings.length).toFixed(2) : 0
        },
        reviews: {
          total: reviews.length,
          averageRating: reviews.length > 0 
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
            : 0
        },
        performance: {
          completionRate: bookings.length > 0
            ? (bookings.filter(b => b.status === 'completed').length / bookings.length * 100).toFixed(2)
            : 0,
          cancellationRate: bookings.length > 0
            ? (bookings.filter(b => b.status === 'cancelled').length / bookings.length * 100).toFixed(2)
            : 0
        }
      };

      logger.info(`Worker performance report generated for: ${workerId}`);

      return stats;
    } catch (error) {
      logger.error(`Error getting worker performance report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Helper: Get total revenue
   */
  async getTotalRevenue() {
    const result = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Helper: Get worker earnings
   */
  async getWorkerEarnings(workerId) {
    const result = await Payment.aggregate([
      { $match: { workerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$workerAmount' } } }
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Helper: Get worker earnings for period
   */
  async getWorkerEarningsForPeriod(workerId, startDate, endDate) {
    const result = await Payment.aggregate([
      {
        $match: {
          workerId,
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$workerAmount' } } }
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Helper: Get worker average rating
   */
  async getWorkerAverageRating(workerId) {
    const worker = await Worker.findOne({ userId: workerId })
      .select('ratings')
      .lean();
    return worker?.ratings?.average || 0;
  }

  /**
   * Helper: Get customer total spent
   */
  async getCustomerTotalSpent(customerId) {
    const result = await Payment.aggregate([
      { $match: { customerId, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Helper: Get revenue for period
   */
  async getRevenueForPeriod(startDate, endDate) {
    const result = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      { $group: { _id: null, total: { $sum: '$platformFee' } } }
    ]);
    return result[0]?.total || 0;
  }

  /**
   * Helper: Get active user count (users with activity in last 30 days)
   */
  async getActiveUserCount() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await Booking.distinct('customerId', {
      createdAt: { $gte: thirtyDaysAgo }
    });

    return activeUsers.length;
  }

  /**
   * Helper: Get average bookings per user
   */
  async getAverageBookingsPerUser() {
    const totalBookings = await Booking.countDocuments();
    const uniqueCustomers = await Booking.distinct('customerId');
    
    return uniqueCustomers.length > 0 
      ? totalBookings / uniqueCustomers.length 
      : 0;
  }

  /**
   * Helper: Get return customer rate
   */
  async getReturnCustomerRate() {
    const customersWithMultipleBookings = await Booking.aggregate([
      {
        $group: {
          _id: '$customerId',
          bookingCount: { $sum: 1 }
        }
      },
      {
        $match: {
          bookingCount: { $gt: 1 }
        }
      }
    ]);

    const totalCustomers = await Customer.countDocuments();
    
    return totalCustomers > 0
      ? (customersWithMultipleBookings.length / totalCustomers * 100)
      : 0;
  }

  /**
   * Export analytics data to CSV format
   */
  async exportAnalyticsToCsv(type, params = {}) {
    try {
      let data;
      
      switch (type) {
        case 'bookings':
          data = await Booking.find(params).lean();
          break;
        case 'payments':
          data = await Payment.find(params).lean();
          break;
        case 'reviews':
          data = await Review.find(params).lean();
          break;
        case 'workers':
          data = await Worker.find(params).lean();
          break;
        default:
          throw new Error('Invalid export type');
      }

      logger.info(`Analytics data exported: ${type}`);

      return data;
    } catch (error) {
      logger.error(`Error exporting analytics data: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AnalyticsService();