// Individual Automation API
// Get, update, and delete specific automations

import { NextRequest, NextResponse } from 'next/server';
import { automationStorage } from '@/lib/automationStorage';
import { automationEngine } from '@/lib/automationEngine';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Get specific automation
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    const automation = await automationStorage.loadAutomation(id);
    
    if (!automation) {
      return NextResponse.json({
        success: false,
        message: 'Automation not found'
      }, { status: 404 });
    }

    // Include execution status if running
    const executionStatus = automationEngine.getExecutionStatus(id);

    return NextResponse.json({
      success: true,
      data: {
        ...automation,
        ...(executionStatus && { executionStatus })
      },
      message: 'Automation retrieved successfully'
    });

  } catch (error: any) {
    console.error('Error fetching automation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch automation',
      errors: [error.message]
    }, { status: 500 });
  }
}

// PUT - Update specific automation
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    // Load existing automation
    const existingAutomation = await automationStorage.loadAutomation(id);
    if (!existingAutomation) {
      return NextResponse.json({
        success: false,
        message: 'Automation not found'
      }, { status: 404 });
    }

    // Update automation - explicitly preserve only essential fields from existing
    const updatedAutomation = {
      id: existingAutomation.id, // Preserve ID
      name: body.name || existingAutomation.name,
      description: body.description || existingAutomation.description,
      type: body.type || existingAutomation.type,
      status: body.status || existingAutomation.status,
      isActive: body.isActive !== undefined ? body.isActive : existingAutomation.isActive,
      schedule: body.schedule || existingAutomation.schedule, // Use new schedule completely
      template: body.template || existingAutomation.template,
      pushSequence: body.pushSequence || existingAutomation.pushSequence,
      audienceCriteria: body.audienceCriteria || existingAutomation.audienceCriteria,
      settings: body.settings || existingAutomation.settings,
      metadata: body.metadata || existingAutomation.metadata,
      createdAt: existingAutomation.createdAt,
      updatedAt: new Date().toISOString()
    };

    const saveResult = await automationStorage.saveAutomation(updatedAutomation);
    
    if (!saveResult.success) {
      return NextResponse.json(saveResult, { status: 500 });
    }

    // CRITICAL FIX: Handle scheduling changes when automation is updated
    if (updatedAutomation.status === 'active' || updatedAutomation.isActive) {
      // Cancel existing schedule and create new one
      const scheduleResult = await automationEngine.scheduleAutomation(updatedAutomation);
      if (!scheduleResult.success) {
        return NextResponse.json({
          success: false,
          message: `Automation updated but rescheduling failed: ${scheduleResult.message}`,
          data: updatedAutomation
        }, { status: 207 });
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedAutomation,
      message: 'Automation updated and rescheduled successfully'
    });

  } catch (error: any) {
    console.error('Error updating automation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to update automation',
      errors: [error.message]
    }, { status: 500 });
  }
}

// DELETE - Delete specific automation
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Check if automation exists
    const existingAutomation = await automationStorage.loadAutomation(id);
    if (!existingAutomation) {
      return NextResponse.json({
        success: false,
        message: 'Automation not found'
      }, { status: 404 });
    }

    // Cancel if running
    if (existingAutomation.status === 'running') {
      await automationEngine.cancelAutomation(id, 'Automation deleted');
    }

    // Delete automation
    const deleteResult = await automationStorage.deleteAutomation(id);
    
    return NextResponse.json(deleteResult, { 
      status: deleteResult.success ? 200 : 500 
    });

  } catch (error: any) {
    console.error('Error deleting automation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete automation',
      errors: [error.message]
    }, { status: 500 });
  }
}