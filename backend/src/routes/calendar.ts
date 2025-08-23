import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import moment from 'moment';
import { Appointment, TimeSlot } from '../types';
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

  const allAppointments: Appointment[] = await Database.getAppointments({
    startDateStr: requestedDate.format('YYYY-MM-DD'),
    endDateStr: requestedDate.format('YYYY-MM-DD')
  }) || []; // Fallback to empty array if undefined

  const potentialSlots = generateTimeSlots(requestedDate, config.weeklySchedule, parseInt(duration as string, 10)) || []; // Fallback to empty array

  const availableSlots = potentialSlots.filter((slot: TimeSlot) => {
    const slotStart = requestedDate.clone().set({
      hour: parseInt(slot.start.split(':')[0], 10),
      minute: parseInt(slot.start.split(':')[1], 10),
    });

    return !allAppointments.some((appt: Appointment) => {
      const apptStart = moment(String(appt.datetime));
      const apptEnd = apptStart.clone().add(appt.duration, 'minutes');
      return slotStart.isBetween(apptStart, apptEnd, undefined, '[)');
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

  const appointments: Appointment[] = await Database.getAppointments({
    startDateStr: start.format('YYYY-MM-DD'),
    endDateStr: end.format('YYYY-MM-DD')
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

      return !dayAppointments.some((appt: Appointment) => {
        const apptStart = moment(String(appt.datetime));
        const apptEnd = apptStart.clone().add(appt.duration, 'minutes');
        return slotStart.isBetween(apptStart, apptEnd, undefined, '[)');
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