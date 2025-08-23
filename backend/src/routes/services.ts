import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { Database } from '../models/database';
import { CreateServiceRequest } from '../types';

const router = Router();

// Get all services for a bot config
router.get(
  '/:botConfigId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { botConfigId } = req.params;
    
    console.log(`🔍 Services API: Getting services for botConfigId: ${botConfigId}`);
    
    const services = await Database.getServices(botConfigId);
    
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
  '/:botConfigId',
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { botConfigId } = req.params;
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
    
    const newService = await Database.createService(botConfigId, serviceData);
    
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
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { serviceId } = req.params;
    const updates: Partial<CreateServiceRequest> = req.body;
    
    // Basic validation
    if (updates.price !== undefined && updates.price < 0) {
      res.status(400).json({ 
        error: 'Price must be non-negative' 
      });
      return;
    }
    
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
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { serviceId } = req.params;
    
    await Database.deleteService(serviceId);
    
    res.json({
      success: true,
      message: 'Service deleted successfully',
      data: { serviceId },
    });
  })
);

export default router; 