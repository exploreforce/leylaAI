import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';

const router = Router();

// Get all pending appointments (status = 'pending')
router.get('/pending-appointments', asyncHandler(async (req: Request, res: Response) => {
  // Optional auth for per-account scoping
  let accountId: string | undefined;
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-secret') as any;
      accountId = payload?.accountId;
    }
  } catch {}
  
  console.log('🔍 GET /review/pending-appointments - accountId:', accountId);
  
  const appointments = await Database.getAppointments({
    status: 'pending',
    accountId,
  });
  
  // Convert UTC datetimes to ISO format for client
  const formattedAppointments = appointments.map(apt => ({
    ...apt,
    datetime: apt.datetime instanceof Date ? apt.datetime.toISOString() : apt.datetime
  }));
  
  console.log(`✅ Found ${formattedAppointments.length} pending appointments`);
  
  return res.json({
    success: true,
    data: formattedAppointments,
    total: formattedAppointments.length,
  });
}));

// Get review stats (count of pending appointments)
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  // Optional auth for per-account scoping
  let accountId: string | undefined;
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-secret') as any;
      accountId = payload?.accountId;
    }
  } catch {}
  
  const pendingAppointments = await Database.getAppointments({
    status: 'pending',
    accountId,
  });
  
  return res.json({
    success: true,
    data: {
      pendingCount: pendingAppointments.length,
    },
  });
}));

// Approve appointment (change status from 'pending' to 'confirmed')
router.post('/approve/:appointmentId', asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  
  // Optional auth for per-account scoping
  let accountId: string | undefined;
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-secret') as any;
      accountId = payload?.accountId;
    }
  } catch {}
  
  console.log(`✅ Approving appointment ${appointmentId}`);
  
  // First, verify the appointment exists and belongs to this account
  const allAppointments = await Database.getAppointments({
    accountId: accountId || undefined
  });
  const appointment = allAppointments.find(apt => apt.id === appointmentId);
  
  if (!appointment) {
    return res.status(404).json({
      success: false,
      error: 'Appointment not found'
    });
  }
  
  if (appointment.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Appointment is not pending (current status: ${appointment.status})`
    });
  }
  
  // Update to confirmed
  const updatedAppointment = await Database.updateAppointment(appointmentId, {
    status: 'confirmed',
  });
  
  if (!updatedAppointment) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
  
  // Format datetime for response
  const response = {
    ...updatedAppointment,
    datetime: updatedAppointment.datetime instanceof Date 
      ? updatedAppointment.datetime.toISOString() 
      : updatedAppointment.datetime
  };
  
  console.log(`✅ Appointment ${appointmentId} approved and confirmed`);
  
  return res.json({
    success: true,
    message: 'Appointment approved successfully',
    data: response,
  });
}));

// Reject appointment (change status from 'pending' to 'cancelled' with reason)
router.post('/reject/:appointmentId', asyncHandler(async (req: Request, res: Response) => {
  const { appointmentId } = req.params;
  const { reason } = req.body;
  
  // Optional auth for per-account scoping
  let accountId: string | undefined;
  try {
    const auth = req.headers.authorization as string | undefined;
    if (auth && auth.startsWith('Bearer ')) {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET || 'dev-secret') as any;
      accountId = payload?.accountId;
    }
  } catch {}
  
  console.log(`❌ Rejecting appointment ${appointmentId}, reason: ${reason || 'No reason provided'}`);
  
  // First, verify the appointment exists and belongs to this account
  const allAppointments = await Database.getAppointments({
    accountId: accountId || undefined
  });
  const appointment = allAppointments.find(apt => apt.id === appointmentId);
  
  if (!appointment) {
    return res.status(404).json({
      success: false,
      error: 'Appointment not found'
    });
  }
  
  if (appointment.status !== 'pending') {
    return res.status(400).json({
      success: false,
      error: `Appointment is not pending (current status: ${appointment.status})`
    });
  }
  
  // Update to cancelled with rejection reason in notes
  const updatedNotes = reason 
    ? `${appointment.notes || ''}\n[REJECTED: ${reason}]`.trim()
    : `${appointment.notes || ''}\n[REJECTED]`.trim();
  
  const updatedAppointment = await Database.updateAppointment(appointmentId, {
    status: 'cancelled',
    notes: updatedNotes,
  });
  
  if (!updatedAppointment) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update appointment'
    });
  }
  
  // Format datetime for response
  const response = {
    ...updatedAppointment,
    datetime: updatedAppointment.datetime instanceof Date 
      ? updatedAppointment.datetime.toISOString() 
      : updatedAppointment.datetime
  };
  
  console.log(`❌ Appointment ${appointmentId} rejected and cancelled`);
  
  return res.json({
    success: true,
    message: 'Appointment rejected successfully',
    data: response,
  });
}));

export default router;

