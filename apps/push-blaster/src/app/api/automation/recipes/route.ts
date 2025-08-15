// Automation Recipes API
// CRUD operations for universal automations building on existing API patterns

import { NextRequest, NextResponse } from 'next/server';
import { automationStorage } from '@/lib/automationStorage';
import { automationEngine } from '@/lib/automationEngine';
import { UniversalAutomation, AutomationResponse } from '@/types/automation';
import { v4 as uuidv4 } from 'uuid';

// GET - List all automations with optional filtering
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const template = searchParams.get('template');

    const filters = {
      ...(status && { status }),
      ...(type && { type }),
      ...(template && { template })
    };

    const automations = await automationStorage.listAutomations(Object.keys(filters).length > 0 ? filters : undefined);

    return NextResponse.json({
      success: true,
      data: automations,
      message: `Found ${automations.length} automations`
    });

  } catch (error: any) {
    console.error('Error fetching automations:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch automations',
      errors: [error.message]
    }, { status: 500 });
  }
}

// POST - Create new automation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validate required fields
    if (!body.name || !body.type || !body.schedule || !body.pushSequence) {
      return NextResponse.json({
        success: false,
        message: 'Missing required fields: name, type, schedule, pushSequence',
        errors: ['Validation failed']
      }, { status: 400 });
    }

    // Generate ID if not provided
    const automationId = body.id || uuidv4();

    // Create automation object with defaults
    const automation: UniversalAutomation = {
      id: automationId,
      name: body.name,
      description: body.description || '',
      type: body.type,
      status: body.status || 'draft',
      isActive: body.isActive !== undefined ? body.isActive : true,
      schedule: {
                  timezone: body.schedule.timezone || 'America/Chicago',
        frequency: body.schedule.frequency,
        startDate: body.schedule.startDate,
        endDate: body.schedule.endDate,
        cronExpression: body.schedule.cronExpression,
        executionTime: body.schedule.executionTime,
        leadTimeMinutes: body.schedule.leadTimeMinutes || 30
      },
      template: body.template || {
        id: 'custom',
        name: 'Custom Template',
        category: 'custom',
        isSystemTemplate: false,
        config: {
          defaultSettings: {},
          pushTemplates: [],
          requiredVariables: []
        }
      },
      pushSequence: body.pushSequence.map((push: any, index: number) => ({
        id: push.id || uuidv4(),
        automationId: automationId,
        sequenceOrder: index + 1,
        title: push.title,
        body: push.body,
        deepLink: push.deepLink || '',
        layerId: push.layerId || 1,
        timing: push.timing || { delayAfterPrevious: 0 },
        status: 'pending'
      })),
      audienceCriteria: body.audienceCriteria || {
        trustedTraderStatus: 'any',
        trustedTraderCandidate: 'any',
        activityDays: 30,
        tradingDays: 30,
        minTrades: 0,
        dataPacks: []
      },
      settings: {
        testUserIds: body.settings?.testUserIds || [],
        maxAudienceSize: body.settings?.maxAudienceSize,
        emergencyStopEnabled: body.settings?.emergencyStopEnabled !== false,
        dryRunFirst: body.settings?.dryRunFirst !== false,
                  cancellationWindowMinutes: body.settings?.cancellationWindowMinutes || 30,
        safeguards: body.settings?.safeguards || {
          maxAudienceSize: 10000,
          requireTestFirst: true,
          emergencyContacts: [],
          alertThresholds: {
            audienceSize: 5000,
            failureRate: 0.1
          }
        }
      },
      metadata: {
        createdBy: body.metadata?.createdBy || 'api',
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save automation
    const saveResult = await automationStorage.saveAutomation(automation);
    
    if (!saveResult.success) {
      return NextResponse.json(saveResult, { status: 500 });
    }

    // Schedule automation if status is 'scheduled'
    if (automation.status === 'scheduled') {
      const scheduleResult = await automationEngine.scheduleAutomation(automation);
      if (!scheduleResult.success) {
        return NextResponse.json({
          success: false,
          message: `Automation created but scheduling failed: ${scheduleResult.message}`,
          data: automation
        }, { status: 207 }); // 207 Multi-Status
      }
    }

    return NextResponse.json({
      success: true,
      data: automation,
      message: 'Automation created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating automation:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create automation',
      errors: [error.message]
    }, { status: 500 });
  }
}

// PUT - Update existing automation
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({
        success: false,
        message: 'Automation ID is required',
        errors: ['Missing ID']
      }, { status: 400 });
    }

    // Load existing automation
    const existingAutomation = await automationStorage.loadAutomation(body.id);
    if (!existingAutomation) {
      return NextResponse.json({
        success: false,
        message: 'Automation not found',
        errors: ['Not found']
      }, { status: 404 });
    }

    // Update automation (merge with existing)
    const updatedAutomation: UniversalAutomation = {
      ...existingAutomation,
      ...body,
      id: existingAutomation.id, // Preserve original ID
      createdAt: existingAutomation.createdAt, // Preserve creation date
      updatedAt: new Date().toISOString(),
      metadata: {
        ...existingAutomation.metadata,
        ...body.metadata
      }
    };

    // Save updated automation
    const saveResult = await automationStorage.saveAutomation(updatedAutomation);
    
    if (!saveResult.success) {
      return NextResponse.json(saveResult, { status: 500 });
    }

    // Handle scheduling changes - CRITICAL FIX: Always reschedule active automations
    if (updatedAutomation.status === 'active' || updatedAutomation.isActive || 
        (updatedAutomation.status === 'scheduled' && existingAutomation.status !== 'scheduled')) {
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
      message: 'Automation updated successfully'
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

// DELETE - Delete automation
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        message: 'Automation ID is required',
        errors: ['Missing ID parameter']
      }, { status: 400 });
    }

    // Check if automation exists
    const existingAutomation = await automationStorage.loadAutomation(id);
    if (!existingAutomation) {
      return NextResponse.json({
        success: false,
        message: 'Automation not found',
        errors: ['Not found']
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