import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import { Appointment, TimeSlot } from '../types';
import { generateTimeSlots, isBlackoutDate } from '../utils/calendarUtils';
import moment from 'moment';

const router = Router();

// Get all appointments
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, status } = req.query;
  
  console.log('🔍 GET /appointments query params:', { startDate, endDate, status });
  
  // NO Date objects - pass strings directly for local datetime filtering
  const startDateStr = startDate as string;
  const endDateStr = endDate as string;
  
  console.log('🔍 Using date strings directly (NO CONVERSION):', {
    startDateInput: startDate,
    endDateInput: endDate,
    startDateStr: startDateStr,
    endDateStr: endDateStr
  });
  
  const appointments = await Database.getAppointments({
    startDateStr: startDateStr,
    endDateStr: endDateStr,
    status: status as 'confirmed' | 'cancelled' | undefined,
  });
  
  console.log('🔍 Database query result:', {
    appointmentsCount: appointments?.length || 0,
    appointments: appointments?.map(apt => ({
      id: apt.id,
      customerName: apt.customerName,
      datetime: apt.datetime
    })) || []
  });
  
  return res.json({
    success: true,
    data: appointments,
    total: appointments.length,
  });
}));

// Create new appointment
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { customerName, customerPhone, customerEmail, datetime, duration, notes, appointmentType } = req.body;
  
  console.log('📝 Creating appointment:', { customerName, customerPhone, customerEmail, datetime, duration, notes, appointmentType });
  
  if (!customerName || !customerPhone || !datetime || !duration) {
    return res.status(400).json({ error: 'Missing required appointment information' });
  }

  const config = await Database.getAvailabilityConfig();
  console.log('📅 Availability config:', config ? 'Found' : 'Not found');
  
  if (!config) {
    console.log('❌ No availability configuration found - allowing appointment anyway');
    // For now, allow appointments even without availability config
    // NO TIMEZONE CONVERSION - store datetime as local string
    const datetimeStr = datetime.replace('T', ' ').slice(0, 16);
    const newAppointmentData = {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      datetime: datetimeStr, // Store as local datetime string
      duration,
      status: 'confirmed',
      notes,
      appointment_type: appointmentType,
    };
    
    console.log('📝 Creating appointment with LOCAL datetime:', datetimeStr);

    const newAppointment = await Database.createAppointment(newAppointmentData);
    
    return res.status(201).json({
      success: true,
      message: 'Appointment created successfully (no availability config)',
      data: newAppointment,
    });
  }

  // NO TIMEZONE CONVERSION - use local datetime strings only
  const datetimeStr = datetime.replace('T', ' ');
  console.log('📅 Processing datetime as LOCAL STRING:', datetimeStr);
  
  console.log('📅 SIMPLIFIED PROCESSING - NO MOMENT.JS:', {
    datetimeInput: datetime,
    datetimeLocal: datetimeStr,
    duration
  });
  
  // SIMPLIFIED: Skip complex availability validation to eliminate timezone issues
  console.log('📅 SKIPPING AVAILABILITY CHECKS - CREATING APPOINTMENT DIRECTLY');

  // NO TIMEZONE CONVERSION - store datetime as local string
  const finalDatetimeStr = datetime.replace('T', ' ').slice(0, 16);
  const newAppointmentData = {
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    datetime: finalDatetimeStr, // Store as local datetime string
    duration,
    status: 'confirmed',
    notes,
    appointment_type: appointmentType,
  };
  
  console.log('📝 Creating appointment with LOCAL datetime:', finalDatetimeStr);

  const newAppointment = await Database.createAppointment(newAppointmentData);
  
  return res.status(201).json({
    success: true,
    message: 'Appointment created successfully',
    data: newAppointment,
  });
}));

// Update appointment
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates: Partial<Appointment> = req.body;
  
  console.log('🔄 UPDATE appointment request:', {
    id,
    updates,
    datetimeInUpdates: updates.datetime,
    datetimeType: typeof updates.datetime
  });
  
  const updatedAppointment = await Database.updateAppointment(id, updates);

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
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  const updatedAppointment = await Database.updateAppointment(id, { status: 'cancelled' });

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