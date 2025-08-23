import moment from 'moment';
import { WeeklySchedule, BlackoutDate, Appointment, TimeSlot } from '../types';

export const generateTimeSlots = (
  date: moment.Moment,
  schedule: WeeklySchedule,
  duration: number
): TimeSlot[] => {
  if (!schedule) {
    return [];
  }
  
  const dayOfWeek = date.format('dddd').toLowerCase();
  const daySchedule = schedule[dayOfWeek];

  if (!daySchedule || !daySchedule.isAvailable || !daySchedule.timeSlots || daySchedule.timeSlots.length === 0) {
    return [];
  }

  const slots: TimeSlot[] = [];
  for (const period of daySchedule.timeSlots) {
    const [startHour, startMinute] = period.start.split(':').map(Number);
    const [endHour, endMinute] = period.end.split(':').map(Number);
    
    let currentTime = moment.utc(date).startOf('day').set({ hour: startHour, minute: startMinute });
    const endTime = moment.utc(date).startOf('day').set({ hour: endHour, minute: endMinute });

    while (currentTime.clone().add(duration, 'minutes').isSameOrBefore(endTime)) {
      slots.push({
        start: currentTime.format('HH:mm'),
        end: currentTime.clone().add(duration, 'minutes').format('HH:mm'),
      });
      currentTime.add(1, 'minute'); // Allow appointments to start at any minute
    }
  }
  return slots;
};

export const isBlackoutDate = (date: moment.Moment, blackoutDates: BlackoutDate[]): boolean => {
  if (!blackoutDates || blackoutDates.length === 0) {
    return false;
  }
  return blackoutDates.some(bd => {
    const blackout = moment.utc(bd.date);
    return blackout.isSame(date, 'day');
  });
}; 