import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AuthRequest } from '../middleware/auth';
import { requireAdmin } from '../middleware/adminAuth';
import { Database, db } from '../models/database';

const router = Router();

// GET /api/stats/overview - Main dashboard overview
router.get('/overview', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const accountId = req.accountId!;
  const { startDate, endDate } = req.query;
  
  console.log('📊 Fetching overview stats for account:', accountId);
  
  const filters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined
  };
  
  const [appointments, chats, redFlags, revenue] = await Promise.all([
    Database.getAppointmentStats(accountId, filters),
    Database.getChatStats(accountId, filters),
    Database.getRedFlagStats(accountId, filters),
    Database.getRevenueStats(accountId, filters)
  ]);
  
  return res.json({
    success: true,
    data: {
      appointments,
      chats,
      redFlags,
      revenue
    }
  });
}));

// GET /api/stats/appointments - Detailed appointment statistics
router.get('/appointments', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const accountId = req.accountId!;
  const { startDate, endDate } = req.query;
  
  console.log('📊 Fetching appointment stats for account:', accountId);
  
  const filters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined
  };
  
  const [topServices, weekdayDistribution, hourDistribution, topCustomers] = await Promise.all([
    Database.getTopServices(accountId, filters),
    Database.getWeekdayDistribution(accountId, filters),
    Database.getHourDistribution(accountId, filters),
    Database.getTopCustomers(accountId, filters)
  ]);
  
  return res.json({
    success: true,
    data: {
      topServices,
      weekdayDistribution,
      hourDistribution,
      topCustomers
    }
  });
}));

// GET /api/stats/services - Service performance statistics
router.get('/services', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const accountId = req.accountId!;
  const { startDate, endDate } = req.query;
  
  console.log('📊 Fetching service stats for account:', accountId);
  
  const filters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined
  };
  
  const serviceStats = await Database.getServiceStats(accountId, filters);
  
  return res.json({
    success: true,
    data: serviceStats
  });
}));

// GET /api/stats/timeline - Timeline data for charts
router.get('/timeline', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const accountId = req.accountId!;
  const { period, startDate, endDate } = req.query;
  
  console.log('📊 Fetching timeline stats for account:', accountId, 'period:', period);
  
  const filters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    period: (period as 'day' | 'week' | 'month') || 'day'
  };
  
  const timelineData = await Database.getTimelineData(accountId, filters);
  
  return res.json({
    success: true,
    data: timelineData
  });
}));

// GET /api/stats/export - Export stats as CSV
router.get('/export', requireAdmin as any, asyncHandler(async (req: AuthRequest, res: Response) => {
  const accountId = req.accountId!;
  const { startDate, endDate } = req.query;
  
  console.log('📊 Exporting stats for account:', accountId);
  
  const filters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined
  };
  
  // Fetch all stats
  const [appointments, services, customers] = await Promise.all([
    Database.getAppointmentStats(accountId, filters),
    Database.getServiceStats(accountId, filters),
    Database.getTopCustomers(accountId, filters)
  ]);
  
  // Generate CSV
  let csv = 'Category,Metric,Value\n';
  
  // Appointment stats
  csv += `Appointments,Total,${appointments.total}\n`;
  csv += `Appointments,Confirmed,${appointments.confirmed}\n`;
  csv += `Appointments,Cancelled,${appointments.cancelled}\n`;
  csv += `Appointments,No-Show,${appointments.noshow}\n`;
  csv += `Appointments,Completed,${appointments.completed}\n`;
  csv += `Appointments,Pending,${appointments.pending}\n`;
  csv += `Appointments,Conversion Rate,${appointments.conversionRate}%\n`;
  csv += `Appointments,No-Show Rate,${appointments.noshowRate}%\n`;
  csv += `Appointments,Unique Customers,${appointments.uniqueCustomers}\n`;
  
  // Service stats
  csv += '\nService Statistics\n';
  csv += 'Service Name,Bookings,Revenue,Avg Duration\n';
  services.forEach(service => {
    csv += `${service.name},${service.bookingCount},${service.totalRevenue},${service.avgDuration}\n`;
  });
  
  // Top customers
  csv += '\nTop Customers\n';
  csv += 'Customer Name,Phone,Bookings,Total Revenue,Last Booking\n';
  customers.forEach(customer => {
    csv += `${customer.name},${customer.phone},${customer.bookings},${customer.totalRevenue},${customer.lastBooking}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=dashboard-stats-${Date.now()}.csv`);
  return res.send(csv);
}));

export default router;

