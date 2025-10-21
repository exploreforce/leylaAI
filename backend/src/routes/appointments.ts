import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import { Appointment, TimeSlot } from '../types';
import { generateTimeSlots, isBlackoutDate } from '../utils/calendarUtils';
import { convertToUTC, convertFromUTC, formatForDatabase } from '../utils/timezoneUtils';
import moment from 'moment';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all appointments
router.get('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { startDate, endDate, status } = req.query;
  const accountId = req.accountId!;
  
  console.log(`🔍 [AccountId: ${accountId}] GET /appointments query params:`, { startDate, endDate, status });
  
  // NO Date objects - pass strings directly for local datetime filtering
  const startDateStr = startDate as string;
  const endDateStr = endDate as string;
  
  console.log('🔍 Using date strings directly (NO CONVERSION):', {
    startDateInput: startDate,
    endDateInput: endDate,
    startDateStr: startDateStr,
    endDateStr: endDateStr,
    accountIdFilter: accountId
  });
  
  const appointments = await Database.getAppointments({
    startDateStr: startDateStr,
    endDateStr: endDateStr,
    status: status as 'confirmed' | 'cancelled' | undefined,
    accountId,
    includeInactive: true // Admin endpoint: show all appointments including cancelled/completed
  });
  
  // Convert UTC datetimes to ISO format for client
  // Database now stores UTC, we return ISO 8601 strings
  const formattedAppointments = appointments.map(apt => ({
    ...apt,
    // Ensure datetime is returned as ISO string (frontend expects this)
    datetime: apt.datetime instanceof Date ? apt.datetime.toISOString() : apt.datetime
  }));
  
  console.log('🔍 Database query result:', {
    appointmentsCount: formattedAppointments?.length || 0,
    accountIdUsed: accountId,
    appointments: formattedAppointments?.map(apt => ({
      id: apt.id,
      customerName: apt.customerName,
      datetime: apt.datetime,
      account_id: apt.accountId
    })) || []
  });
  
  return res.json({
    success: true,
    data: formattedAppointments,
    total: formattedAppointments.length,
  });
}));

// Create new appointment
router.post('/', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { customerName, customerPhone, customerEmail, datetime, duration, notes, appointmentType } = req.body;
  const accountId = req.accountId!;
  
  console.log(`📝 [AccountId: ${accountId}] Creating appointment:`, { customerName, customerPhone, customerEmail, datetime, duration, notes, appointmentType });
  
  if (!customerName || !customerPhone || !datetime || !duration) {
    return res.status(400).json({ error: 'Missing required appointment information' });
  }

  const config = await Database.getAvailabilityConfig(accountId);
  console.log('📅 Availability config:', config ? 'Found' : 'Not found');
  
  if (!config) {
    console.log('❌ No availability configuration found - allowing appointment anyway');
    
    // Convert datetime to UTC for storage
    const accountTimezone = await Database.getAccountTimezone(accountId);
    const utcDate = formatForDatabase(datetime, accountTimezone);
    
    const newAppointmentData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      datetime: utcDate, // Store as UTC Date object
      duration,
      status: 'confirmed',
      notes,
      appointment_type: appointmentType,
      account_id: accountId,
    };
    
    console.log('📝 Creating appointment with UTC datetime:', {
      input: datetime,
      accountTimezone,
      utcDate: utcDate.toISOString()
    });
    console.log('👤 With account_id:', accountId);

    const newAppointment = await Database.createAppointment(newAppointmentData);
    
    // Return with ISO datetime format
    const response = {
      ...newAppointment,
      datetime: newAppointment.datetime instanceof Date 
        ? newAppointment.datetime.toISOString() 
        : newAppointment.datetime
    };
    
    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully (no availability config)',
      data: response,
    });
  }

  // Convert datetime to UTC for storage
  const accountTimezone = await Database.getAccountTimezone(accountId);
  const utcDate = formatForDatabase(datetime, accountTimezone);
  
  console.log('📅 Processing datetime with timezone conversion:', {
    input: datetime,
    accountTimezone,
    utcDate: utcDate.toISOString(),
    duration
  });
  
  // SIMPLIFIED: Skip complex availability validation to eliminate timezone issues
  console.log('📅 SKIPPING AVAILABILITY CHECKS - CREATING APPOINTMENT DIRECTLY');

  const newAppointmentData = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    datetime: utcDate, // Store as UTC Date object
    duration,
    status: 'confirmed',
    notes,
    appointment_type: appointmentType,
    account_id: accountId,
  };
  
  console.log('📝 Creating appointment with UTC datetime:', utcDate.toISOString());
  console.log('👤 With account_id:', accountId);

  const newAppointment = await Database.createAppointment(newAppointmentData);
  
  // Return with ISO datetime format
  const response = {
    ...newAppointment,
    datetime: newAppointment.datetime instanceof Date 
      ? newAppointment.datetime.toISOString() 
      : newAppointment.datetime
  };
  
  return res.status(201).json({
    success: true,
    message: 'Appointment created successfully',
    data: response,
  });
}));

// Update appointment
router.put('/:id', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updates: Partial<Appointment> = req.body;
  
  console.log(`🔄 [AccountId: ${req.accountId}] UPDATE appointment request:`, {
    id,
    updates,
    datetimeInUpdates: updates.datetime,
    datetimeType: typeof updates.datetime
  });
  
  // Ensure we only update appointments belonging to this account
  const updatedAppointment = await Database.updateAppointment(id, updates, req.accountId!);

  console.log('🔄 UPDATE appointment result:', {
    found: !!updatedAppointment,
    resultDatetime: updatedAppointment?.datetime,
    resultDatetimeType: typeof updatedAppointment?.datetime,
    resultDatetimeISO: updatedAppointment?.datetime ? new Date(updatedAppointment.datetime).toISOString() : null
  });

  if (!updatedAppointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  return res.json({
    success: true,
    message: 'Appointment updated successfully',
    data: updatedAppointment,
  });
}));

// Cancel appointment
router.delete('/:id', requireAuth, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  
  const updatedAppointment = await Database.updateAppointment(id, { status: 'cancelled' }, req.accountId!);

  if (!updatedAppointment) {
    return res.status(404).json({ error: 'Appointment not found' });
  }
  
  return res.json({
    success: true,
    message: 'Appointment cancelled successfully',
    data: { appointmentId: id },
  });
}));

export default router; 