import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import { CreateServiceRequest } from '../types';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Get all services for an account
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const accountId = req.accountId!;
    
    console.log(`🔍 [AccountId: ${accountId}] Services API: Getting services...`);
    
    const services = await Database.getServices(accountId);
    
    console.log(`🔍 Services API: Found ${services?.length || 0} services:`, services);
    
    res.json({
      success: true,
      message: 'Services retrieved successfully',
      data: services || [],
    });
  })
);

// Create a new service
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const accountId = req.accountId!;
    const serviceData: CreateServiceRequest = req.body;
    
    // Basic validation
    if (!serviceData.name || serviceData.price === undefined) {
      res.status(400).json({ 
        error: 'Name and price are required' 
      });
      return;
    }
    
    if (serviceData.price < 0) {
      res.status(400).json({ 
        error: 'Price must be non-negative' 
      });
      return;
    }
    
    console.log(`📝 [AccountId: ${accountId}] Creating service...`);
    const newService = await Database.createService(accountId, serviceData);
    
    res.status(201).json({
      success: true,
      message: 'Service created successfully',
      data: newService,
    });
  })
);

// Update a service
router.put(
  '/:serviceId',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { serviceId } = req.params;
    const accountId = req.accountId!;
    const updates: Partial<CreateServiceRequest> = req.body;
    
    console.log(`🔄 [AccountId: ${accountId}] Updating service: ${serviceId}`);
    
    // Basic validation
    if (updates.price !== undefined && updates.price < 0) {
      res.status(400).json({ 
        error: 'Price must be non-negative' 
      });
      return;
    }
    
    // TODO: Add account ownership verification for service
    const updatedService = await Database.updateService(serviceId, updates);
    
    res.json({
      success: true,
      message: 'Service updated successfully',
      data: updatedService,
    });
  })
);

// Delete a service (soft delete)
router.delete(
  '/:serviceId',
  requireAuth,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { serviceId } = req.params;
    const accountId = req.accountId!;
    
    console.log(`🗑️ [AccountId: ${accountId}] Deleting service: ${serviceId}`);
    
    // TODO: Add account ownership verification for service
    await Database.deleteService(serviceId);
    
    res.json({
      success: true,
      message: 'Service deleted successfully',
      data: { serviceId },
    });
  })
);

export default router; 