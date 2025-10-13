import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import moment from 'moment';
import { Appointment, TimeSlot } from '../types';
import { db } from '../models/database';
import { generateTimeSlots, isBlackoutDate } from '../utils/calendarUtils';

const router = Router();

// Get availability slots
router.get('/availability', asyncHandler(async (req: Request, res: Response) => {
  const { date, duration } = req.query;
  if (!date || !duration) {
    return res.status(400).json({ error: 'date and duration are required' });
  }

  const config = await Database.getAvailabilityConfig();
  if (!config) {
    return res.status(404).json({ error: 'Availability configuration not found' });
  }

  // Use local date strings only
  const requestedDate = moment(String(date)).startOf('day');
  if (isBlackoutDate(requestedDate, config.blackoutDates)) {
    return res.json({ date: requestedDate.format('YYYY-MM-DD'), availableSlots: [] });
  }

  // Get only active appointments (excludes cancelled, completed, noshow)
  // NULL accountIds will block all accounts (system-wide bookings)
  const allAppointments: Appointment[] = await Database.getAppointments({
    startDateStr: requestedDate.format('YYYY-MM-DD'),
    endDateStr: requestedDate.format('YYYY-MM-DD'),
    includeInactive: false
  }) || []; // Fallback to empty array if undefined

  const potentialSlots = generateTimeSlots(requestedDate, config.weeklySchedule, parseInt(duration as string, 10)) || []; // Fallback to empty array

  const availableSlots = potentialSlots.filter((slot: TimeSlot) => {
    const slotStart = requestedDate.clone().set({
      hour: parseInt(slot.start.split(':')[0], 10),
      minute: parseInt(slot.start.split(':')[1], 10),
    });
    const slotEnd = slotStart.clone().add(parseInt(duration as string, 10), 'minutes');

    return !allAppointments.some((appt: Appointment) => {
      const apptStart = moment(String(appt.datetime));
      const apptEnd = apptStart.clone().add(appt.duration, 'minutes');
      
      // Two time periods overlap if: slotStart < apptEnd AND slotEnd > apptStart
      // This correctly handles all overlap scenarios including:
      // - Slot starts during appointment
      // - Slot ends during appointment
      // - Slot completely encompasses appointment
      // - Appointment completely encompasses slot
      return slotStart.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
    });
  });

  return res.json({ date: requestedDate.format('YYYY-MM-DD'), availableSlots });
}));

// Create/update availability
router.put('/availability', asyncHandler(async (req: Request, res: Response) => {
  const { weeklySchedule, blackoutDates } = req.body;

  const config = await Database.updateAvailabilityConfig(weeklySchedule);

  return res.json({
    message: 'Availability updated successfully',
    config,
  });
}));

// Get calendar overview
router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'startDate and endDate are required' });
  }

  const config = await Database.getAvailabilityConfig();
  if (!config) {
    return res.status(404).json({ error: 'Availability configuration not found' });
  }

  const start = moment(String(startDate)).startOf('day');
  const end = moment(String(endDate)).endOf('day');

  // Get only active appointments for overview (excludes cancelled, completed, noshow)
  const appointments: Appointment[] = await Database.getAppointments({
    startDateStr: start.format('YYYY-MM-DD'),
    endDateStr: end.format('YYYY-MM-DD'),
    includeInactive: false
  }) || []; // Fallback to empty array if undefined

  let totalAvailableSlots = 0;
  for (let m = start.clone(); m.isBefore(end); m.add(1, 'days')) {
    if (isBlackoutDate(m, config.blackoutDates)) {
      continue;
    }
    const potentialSlots = generateTimeSlots(m, config.weeklySchedule, 30) || []; // Fallback to empty array
    const dayAppointments = appointments.filter((a: Appointment) => moment(String(a.datetime)).isSame(m, 'day'));
    
    const availableSlots = potentialSlots.filter((slot: TimeSlot) => {
      const slotStart = m.clone().set({
        hour: parseInt(slot.start.split(':')[0], 10),
        minute: parseInt(slot.start.split(':')[1], 10),
      });
      const slotEnd = slotStart.clone().add(30, 'minutes'); // Overview uses 30-min slots

      return !dayAppointments.some((appt: Appointment) => {
        const apptStart = moment(String(appt.datetime));
        const apptEnd = apptStart.clone().add(appt.duration, 'minutes');
        
        // Two time periods overlap if: slotStart < apptEnd AND slotEnd > apptStart
        return slotStart.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
      });
    }).length;

    totalAvailableSlots += availableSlots;
  }

  return res.json({
    period: { startDate, endDate },
    totalAppointments: appointments.length,
    availableSlots: totalAvailableSlots,
    busySlots: appointments.length, // This is a simplification
  });
}));

export default router; 
 
// ICS feed (must be last export in file)
router.get('/ics', asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate, token } = req.query as { startDate?: string; endDate?: string; token?: string };

  // Determine range: default last 30 days to next 180 days
  const start = startDate ? moment(String(startDate)).startOf('day') : moment().subtract(30, 'days').startOf('day');
  const end = endDate ? moment(String(endDate)).endOf('day') : moment().add(180, 'days').endOf('day');

  // Optional per-user scoping via feed token
  let accountIdFilter: string | undefined;
  if (token) {
    const user = await Database.getUserByFeedToken(token);
    if (!user) {
      res.status(404).send('Calendar feed not found');
      return;
    }
    accountIdFilter = user.account_id;
  }

  // Build base query to include optional account scoping
  let appointmentsQuery = db('appointments').select('*')
    .where('datetime', '>=', `${start.format('YYYY-MM-DD')} 00:00`)
    .andWhere('datetime', '<=', `${end.format('YYYY-MM-DD')} 23:59`)
    .orderBy('datetime', 'asc');

  if (accountIdFilter) {
    appointmentsQuery = appointmentsQuery.andWhere('account_id', accountIdFilter);
  }

  const raw = await appointmentsQuery;
  const appointments: Appointment[] = (raw || []).map((row: any) => ({
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    datetime: row.datetime,
    duration: row.duration,
    status: row.status,
    notes: row.notes,
    appointmentType: row.appointment_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  // Build ICS content
  const escapeText = (value: string | undefined | null) => {
    const v = (value || '').toString();
    return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);
  };

  const toUtcStamp = (localString: string, durationMin?: number) => {
    // localString like 'YYYY-MM-DD HH:mm' or ISO; treat as local time and output Zulu
    const local = localString.includes('T') ? localString.replace('Z', ' ').replace('T', ' ') : localString;
    const m = moment(local, [
      'YYYY-MM-DD HH:mm',
      'YYYY-MM-DD HH:mm:ss',
      moment.ISO_8601
    ], true);
    const startUtc = (m.isValid() ? m : moment()).utc();
    const endUtc = startUtc.clone().add(durationMin || 60, 'minutes');
    return {
      dtStart: startUtc.format('YYYYMMDD[T]HHmmss[Z]'),
      dtEnd: endUtc.format('YYYYMMDD[T]HHmmss[Z]'),
    };
  };

  const icsEvents = appointments.map((apt) => {
    const { dtStart, dtEnd } = toUtcStamp(String(apt.datetime), apt.duration);
    const summary = `${apt.customerName}${apt.appointmentType ? ' - ' + apt.appointmentType : ''}`;
    const description = escapeText(apt.notes || 'Leyla AI Appointment');
    const status = (apt.status || 'confirmed').toUpperCase();
    return [
      'BEGIN:VEVENT',
      `UID:${apt.id}@whatsappbot`,
      `DTSTAMP:${moment().utc().format('YYYYMMDD[T]HHmmss[Z]')}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${description}`,
      'LOCATION:Leyla AI',
      `STATUS:${status}`,
      'END:VEVENT'
    ].join('\n');
  }).join('\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Leyla AI//Leyla AI Calendar Pro//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    icsEvents,
    'END:VCALENDAR'
  ].join('\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="leyla-calendar.ics"');
  res.send(ics);
}));