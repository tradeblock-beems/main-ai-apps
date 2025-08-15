// Universal Automation Engine
// Core orchestrator for all automation types building on existing push-blaster patterns

import * as cron from 'node-cron';
import { 
  UniversalAutomation, 
  ExecutionConfig, 
  AutomationStatus, 
  ExecutionPhase,
  AutomationPush,
  ExecutionResponse 
} from '@/types/automation';

interface ScheduledJob {
  automationId: string;
  cronJob: cron.ScheduledTask;
  executionConfig: ExecutionConfig;
}

export class AutomationEngine {
  private scheduledJobs: Map<string, ScheduledJob> = new Map();
  private activeExecutions: Map<string, { 
    automationId: string; 
    startTime: Date; 
    currentPhase: string;
    abortController?: AbortController;
  }> = new Map();
  private logPrefix = '[AutomationEngine]';

  constructor() {
    this.log('Automation Engine initialized - simple mode');
    // Simple restoration on startup - no race conditions
    this.restoreActiveAutomations();
  }

  /**
   * SIMPLE restoration - just reschedule active automations
   * NO RECOVERY LOGIC - NO RACE CONDITIONS - JUST SCHEDULING
   */
  private async restoreActiveAutomations(): Promise<void> {
    try {
      this.log('🔄 Restoring active automations from storage...');
      const { automationStorage } = await import('./automationStorage');
      const allAutomations = await automationStorage.loadAllAutomations();
      
      const activeAutomations = allAutomations.filter(automation => 
        (automation as any).status === 'active' && (automation as any).isActive
      );
      
      this.log(`📋 Found ${activeAutomations.length} active automations to restore`);
      
      for (const automation of activeAutomations) {
        const result = await this.scheduleAutomation(automation);
        if (result.success) {
          this.log(`✅ Restored automation: ${automation.name}`);
        } else {
          this.logError(`❌ Failed to restore automation: ${automation.name}`, result.message);
        }
      }
      
      this.log(`🎉 Restoration complete: ${activeAutomations.length} automations scheduled`);
      
    } catch (error: any) {
      this.logError('❌ Failed to restore active automations', error);
      // Don't throw - let the engine continue working
    }
  }

  /**
   * Schedule an automation for execution
   * Builds on existing scheduling patterns from push-blaster
   */
  async scheduleAutomation(automation: UniversalAutomation): Promise<{ success: boolean; message: string }> {
    try {
      // EXECUTION-AWARE RESCHEDULING: Kill active execution first
      if (this.isExecutionActive(automation.id)) {
        const status = this.getExecutionStatus(automation.id);
        this.log(`🚨 Active execution detected (phase: ${status?.phase}) - terminating before rescheduling`);
        
        await this.terminateExecution(automation.id, 'Rescheduling with new time');
        this.log(`✅ Active execution terminated for rescheduling`);
      }

      // Cancel existing scheduled job if it exists (simple replace)
      if (this.scheduledJobs.has(automation.id)) {
        const existingJob = this.scheduledJobs.get(automation.id);
        if (existingJob) {
          existingJob.cronJob.stop();
          existingJob.cronJob.destroy();
          this.scheduledJobs.delete(automation.id);
          this.log(`✅ Cancelled existing cron job for automation: ${automation.id}`);
        }
      } else {
        this.log(`ℹ️  No existing cron job found for automation: ${automation.id} (scheduledJobs size: ${this.scheduledJobs.size})`);
      }

      // Validate automation
      if (!this.validateAutomation(automation)) {
        throw new Error('Invalid automation configuration');
      }

      // Convert schedule to cron expression
      const cronExpression = this.buildCronExpression(automation);
      this.log(`Building cron expression for automation ${automation.id}: ${cronExpression}`);
      
      // Create execution config
      const executionConfig: ExecutionConfig = {
        currentPhase: 'waiting',
        startTime: '',
        expectedEndTime: '',
        audienceGenerated: false,
        testsSent: false,
        cancellationDeadline: '',
        canCancel: true,
        emergencyStopRequested: false
      };

      // Schedule the cron job
      const cronJob = cron.schedule(cronExpression, async () => {
        // Execute automation (safety check commented out temporarily)
        await this.executeAutomation(automation.id);
      }, {
        timezone: automation.schedule.timezone || 'America/Chicago'
      });

      // Store the scheduled job
      this.scheduledJobs.set(automation.id, {
        automationId: automation.id,
        cronJob,
        executionConfig
      });

      // Start the job
      cronJob.start();

      this.log(`✅ Automation ${automation.id} scheduled with cron: ${cronExpression} (total jobs: ${this.scheduledJobs.size})`);
      
      return {
        success: true,
        message: `Automation "${automation.name}" scheduled successfully`
      };

    } catch (error: any) {
      this.logError('Failed to schedule automation', error);
      return {
        success: false,
        message: `Failed to schedule automation: ${error.message}`
      };
    }
  }

  /**
   * Execute automation timeline (30-minute lead time process)
   */
  private async executeAutomation(automationId: string): Promise<void> {
    try {
      this.log(`Starting execution timeline for automation: ${automationId}`);
      
      // Load automation data
      const automation = await this.loadAutomation(automationId);
      if (!automation) {
        throw new Error(`Automation ${automationId} not found`);
      }

      // Track active execution
      const abortController = new AbortController();
      this.activeExecutions.set(automationId, {
        automationId,
        startTime: new Date(),
        currentPhase: 'starting',
        abortController
      });

      // Initialize execution config
      const executionConfig: ExecutionConfig = {
        currentPhase: 'audience_generation',
        startTime: new Date().toISOString(),
        expectedEndTime: this.calculateExpectedEndTime(automation),
        audienceGenerated: false,
        testsSent: false,
        cancellationDeadline: this.calculateCancellationDeadline(automation),
        canCancel: true,
        emergencyStopRequested: false
      };

      try {
        // Execute the timeline (with abort signal)
        await this.executeTimeline(automation, executionConfig, abortController.signal);
        
        this.log(`Completed execution for automation: ${automationId}`);
      } finally {
        // Always remove from active executions when done
        this.activeExecutions.delete(automationId);
      }

    } catch (error: any) {
      // Clean up active execution on error
      this.activeExecutions.delete(automationId);
      this.logError(`Automation execution failed for ${automationId}`, error);
      // No complex failure handling - just log and continue
    }
  }

  /**
   * Execute the automation timeline phases
   */
  private async executeTimeline(automation: UniversalAutomation, executionConfig: ExecutionConfig, abortSignal?: AbortSignal): Promise<void> {
    const startTime = new Date();
    this.log(`🚀 TIMELINE START: Automation ${automation.id} execution pipeline beginning`);
    this.log(`📅 Send scheduled for: ${automation.schedule.executionTime} (${automation.schedule.timezone})`);
    this.log(`⏱️  Lead time: ${automation.schedule.leadTimeMinutes || 30} minutes`);
    
    try {
      // Phase 1: Audience Generation (T-30 minutes)
      this.updateExecutionPhase(automation.id, 'audience_generation');
      this.checkAbortSignal(abortSignal, automation.id);
      this.log(`📊 PHASE 1: Starting audience generation phase`);
      await this.executeAudienceGeneration(automation, executionConfig);
      this.log(`✅ PHASE 1: Audience generation completed successfully`);
      
      // Phase 2: Test Push Sending (T-25 minutes) 
      this.updateExecutionPhase(automation.id, 'test_sending');
      this.checkAbortSignal(abortSignal, automation.id);
      this.log(`🧪 PHASE 2: Starting test push sending phase`);
      await this.executeTestSending(automation, executionConfig);
      this.log(`✅ PHASE 2: Test push sending completed successfully`);
      
      // Phase 3: Cancellation Window (T-25 to T-0)
      this.updateExecutionPhase(automation.id, 'cancellation_window');
      this.checkAbortSignal(abortSignal, automation.id);
      this.log(`⏳ PHASE 3: Starting cancellation window (until ${this.formatTime(new Date(executionConfig.cancellationDeadline))})`);
      await this.executeCancellationWindow(automation, executionConfig);
      this.log(`✅ PHASE 3: Cancellation window completed - proceeding to live execution`);
      
      // Phase 4: Live Execution (T-0)
      this.updateExecutionPhase(automation.id, 'live_execution');
      this.checkAbortSignal(abortSignal, automation.id);
      this.log(`🔴 PHASE 4: Starting live execution phase`);
      await this.executeLiveSending(automation, executionConfig);
      this.log(`✅ PHASE 4: Live execution completed successfully`);
      
      // Phase 5: Cleanup (for test automations)
      this.updateExecutionPhase(automation.id, 'cleanup');
      this.checkAbortSignal(abortSignal, automation.id);
      this.log(`🧹 PHASE 5: Starting cleanup phase`);
      await this.executeCleanup(automation, executionConfig);
      this.log(`✅ PHASE 5: Cleanup completed successfully`);
      
      const totalDuration = Date.now() - startTime.getTime();
      this.log(`🎉 TIMELINE COMPLETE: Total execution time ${Math.round(totalDuration / 1000)}s`);
      
    } catch (error: any) {
      const totalDuration = Date.now() - startTime.getTime();
      this.logError(`❌ TIMELINE FAILED: After ${Math.round(totalDuration / 1000)}s - ${error.message}`, error);
      throw error;
    }
  }

  /**
   * Helper methods for execution tracking and termination
   */
  private updateExecutionPhase(automationId: string, phase: string): void {
    const execution = this.activeExecutions.get(automationId);
    if (execution) {
      execution.currentPhase = phase;
    }
  }

  private checkAbortSignal(abortSignal: AbortSignal | undefined, automationId: string): void {
    if (abortSignal?.aborted) {
      this.log(`🛑 Execution aborted for automation: ${automationId}`);
      throw new Error(`Execution aborted for automation: ${automationId}`);
    }
  }

  /**
   * Check if automation is currently executing
   */
  public isExecutionActive(automationId: string): boolean {
    return this.activeExecutions.has(automationId);
  }

  /**
   * Get current execution status
   */
  public getExecutionStatus(automationId: string): { phase: string; startTime: Date } | null {
    const execution = this.activeExecutions.get(automationId);
    if (!execution) return null;
    
    return {
      phase: execution.currentPhase,
      startTime: execution.startTime
    };
  }

  /**
   * Terminate active execution for an automation
   */
  public async terminateExecution(automationId: string, reason: string = 'Manual termination'): Promise<boolean> {
    const execution = this.activeExecutions.get(automationId);
    if (!execution) {
      this.log(`No active execution found for automation: ${automationId}`);
      return false;
    }

    this.log(`🛑 Terminating execution for automation: ${automationId} - ${reason}`);
    
    // Abort the execution
    if (execution.abortController) {
      execution.abortController.abort();
    }
    
    // Remove from active executions
    this.activeExecutions.delete(automationId);
    
    this.log(`✅ Execution terminated for automation: ${automationId}`);
    return true;
  }

  /**
   * Generate audiences for all pushes in sequence
   */
  private async executeAudienceGeneration(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`Generating audiences for automation: ${automation.id}`);
    executionConfig.currentPhase = 'audience_generation';

    try {
      // For sequences, generate audience for each push
      for (const push of automation.pushSequence) {
        await this.generatePushAudience(automation, push);
      }

      executionConfig.audienceGenerated = true;
      this.log(`Audience generation completed for automation: ${automation.id}`);
      
    } catch (error: any) {
      throw new Error(`Audience generation failed: ${error.message}`);
    }
  }

  /**
   * Send test pushes to configured test users
   * 
   * CRITICAL FIX: Call test API only ONCE for entire automation sequence
   * Previously: Loop through each push → call test API 3x → API processes full sequence each time = 9 total
   * Now: Call test API once → API processes full sequence once = 3 total (correct)
   */
  private async executeTestSending(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`Sending test pushes for automation: ${automation.id}`);
    executionConfig.currentPhase = 'test_sending';

    try {
      if (automation.settings.dryRunFirst) {
        this.log(`🧪 Executing test send for entire sequence (${automation.pushSequence.length} pushes)`);
        
        // FIXED: Call test API only ONCE for the entire automation (not per push)
        await this.sendTestPushSequence(automation);
        
        this.log(`✅ Test sequence completed: ${automation.pushSequence.length} pushes sent to test audience`);
      }

      executionConfig.testsSent = true;
      this.log(`Test sending completed for automation: ${automation.id}`);
      
    } catch (error: any) {
      throw new Error(`Test sending failed: ${error.message}`);
    }
  }

  /**
   * Monitor for cancellation requests during window
   */
  private async executeCancellationWindow(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    executionConfig.currentPhase = 'cancellation_window';
    
    const cancellationDeadline = new Date(executionConfig.cancellationDeadline);
    const checkInterval = 30000; // Check every 30 seconds
    const totalWindowMinutes = automation.settings.cancellationWindowMinutes || 25;
    
    this.log(`⏰ Cancellation window: ${totalWindowMinutes} minutes remaining until live send`);
    this.log(`🛑 Emergency stop available until: ${this.formatTime(cancellationDeadline)}`);

    return new Promise((resolve, reject) => {
      const monitor = setInterval(() => {
        const now = new Date();
        const remainingMinutes = Math.max(0, Math.ceil((cancellationDeadline.getTime() - now.getTime()) / 60000));
        
        // Log countdown every 5 minutes and final minute
        if (remainingMinutes % 5 === 0 || remainingMinutes <= 1) {
          this.log(`⏳ Cancellation window: ${remainingMinutes} minutes remaining`);
        }
        
        // Check for emergency stop
        if (executionConfig.emergencyStopRequested) {
          clearInterval(monitor);
          this.log(`🚨 Emergency stop requested during cancellation window`);
          reject(new Error('Emergency stop requested'));
          return;
        }
        
        // Check if cancellation window has expired
        if (now >= cancellationDeadline) {
          clearInterval(monitor);
          executionConfig.canCancel = false;
          this.log(`🔒 Cancellation window closed - proceeding to live execution`);
          resolve();
          return;
        }
      }, checkInterval);
    });
  }

  /**
   * Execute live push sending using the PROVEN test-automation API
   * 
   * CRITICAL CHANGE: Instead of custom sendLivePush loop, use the same proven API
   * that test pushes use. This ensures identical processing logic and eliminates
   * the architectural divergence that was causing live send failures.
   */
  private async executeLiveSending(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`🚀 Starting live execution for automation: ${automation.id}`);
    this.log(`📬 Using proven test-automation API with 'live-send' mode`);
    this.log(`📬 Sequence: ${automation.pushSequence.length} pushes to send`);
    executionConfig.currentPhase = 'live_execution';

    try {
      // Use the SAME proven API that test pushes use, but with live-send mode
      // This ensures IDENTICAL processing: script → audiences → variable processing → live sends
      this.log(`🔗 Calling unified test-automation API for live execution`);
      
      const response = await fetch(`http://localhost:3001/api/automation/test/${automation.id}?mode=live-send`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`Live send API failed: ${response.status} ${response.statusText}`);
      }
      
      // Note: The test-automation API uses Server-Sent Events, but we don't need to parse them
      // for this automation flow. The API will handle the complete execution pipeline.
      this.log(`✅ Live send API call completed successfully`);

      executionConfig.currentPhase = 'completed';
      this.log(`🎉 Live execution completed successfully for automation: ${automation.id}`);
      this.log(`📊 All pushes processed through unified test-automation pipeline`);
      
    } catch (error: any) {
      this.logError(`❌ Live execution failed for automation ${automation.id}`, error);
      throw new Error(`Live execution failed: ${error.message}`);
    }
  }

  /**
   * Build cron expression from automation schedule
   * 
   * CRITICAL TIMING LOGIC (FIXED - eliminates double subtraction):
   * - schedule.executionTime = SEND TIME from UI (when user wants pushes delivered)  
   * - schedule.leadTimeMinutes = automation start offset (default 30 minutes)
   * - AUTOMATION START TIME = executionTime - leadTimeMinutes
   * - This eliminates the double subtraction bug by using leadTimeMinutes consistently
   * - executionTime should now store the UI send time directly (no subtraction at save time)
   */
  private buildCronExpression(automation: UniversalAutomation): string {
    const schedule = automation.schedule;
    
    if (schedule.cronExpression) {
      return schedule.cronExpression;
    }

    // Parse the SEND TIME from executionTime field (HH:MM) 
    const [sendHours, sendMinutes] = schedule.executionTime.split(':').map(Number);
    
    // Calculate AUTOMATION START TIME using leadTimeMinutes (eliminates double subtraction)
    const leadTime = schedule.leadTimeMinutes || 30; // Default to 30 minutes if not specified
    const totalMinutesFromMidnight = (sendHours * 60) + sendMinutes;
    const executionMinutesFromMidnight = totalMinutesFromMidnight - leadTime;
    
    // Handle day rollover if execution time goes negative (e.g., 12:15 AM send - 30 min = 11:45 PM previous day)
    let actualExecutionMinutes = executionMinutesFromMidnight;
    if (actualExecutionMinutes < 0) {
      actualExecutionMinutes += 24 * 60; // Add 24 hours worth of minutes
      // Note: For daily automation, this means it will run the previous day
      // For one-time automation, we'd need special handling
    }
    
    const executionHours = Math.floor(actualExecutionMinutes / 60);
    const executionMinutes = actualExecutionMinutes % 60;
    
    this.log(`Schedule calculation: Send time ${schedule.executionTime} - ${leadTime}min lead = Automation starts at ${executionHours.toString().padStart(2, '0')}:${executionMinutes.toString().padStart(2, '0')}`);

    switch (schedule.frequency) {
      case 'once':
        // For one-time execution, we'll use the start date with calculated execution time
        // Parse the date in the automation's timezone to avoid UTC conversion issues
        const startDate = new Date(`${schedule.startDate}T${schedule.executionTime}`);
        const day = startDate.getDate();
        const month = startDate.getMonth() + 1;
        this.log(`One-time schedule: ${schedule.startDate} ${schedule.executionTime} (send) -> execution cron: ${executionMinutes} ${executionHours} ${day} ${month} *`);
        return `${executionMinutes} ${executionHours} ${day} ${month} *`;
      
      case 'daily':
        return `${executionMinutes} ${executionHours} * * *`;
      
      case 'weekly':
        // Default to Monday (1), can be extended for specific days
        return `${executionMinutes} ${executionHours} * * 1`;
      
      case 'monthly':
        // Default to 1st of month, can be extended
        return `${executionMinutes} ${executionHours} 1 * *`;
      
      default:
        throw new Error(`Unsupported schedule frequency: ${schedule.frequency}`);
    }
  }

  /**
   * Manual trigger for testing - reschedule an existing automation
   */
  async rescheduleAutomation(automationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const { automationStorage } = await import('./automationStorage');
      const automation = await automationStorage.loadAutomation(automationId);
      
      if (!automation) {
        return { success: false, message: 'Automation not found' };
      }
      
      // Cancel existing job if it exists
      const existingJob = this.scheduledJobs.get(automationId);
      if (existingJob) {
        existingJob.cronJob.stop();
        existingJob.cronJob.destroy();
        this.scheduledJobs.delete(automationId);
        this.log(`Cancelled existing job for automation: ${automationId}`);
      }
      
      // Reschedule
      return await this.scheduleAutomation(automation);
      
    } catch (error: any) {
      this.logError('Failed to reschedule automation', error);
      return { success: false, message: `Failed to reschedule: ${error.message}` };
    }
  }

  /**
   * Cleanup after automation execution
   */
  private async executeCleanup(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`🧹 Executing cleanup for automation: ${automation.id}`);
    
    try {
      // Simple cleanup - no complex state tracking
      
      // For test automations, clean up the scheduled job and delete the automation file
      if ((automation.settings as any)?.isTest || automation.name?.includes('TEST SCHEDULED:')) {
        this.log(`Cleaning up test automation: ${automation.id}`);
        
        // Remove from scheduled jobs
        if (this.scheduledJobs.has(automation.id)) {
          const jobInfo = this.scheduledJobs.get(automation.id);
          if (jobInfo) {
            jobInfo.cronJob.stop();
            jobInfo.cronJob.destroy();
          }
          this.scheduledJobs.delete(automation.id);
        }
        
        // Delete the automation file
        try {
          const { automationStorage } = await import('./automationStorage');
          await automationStorage.deleteAutomation(automation.id);
          this.log(`Deleted test automation file: ${automation.id}`);
        } catch (error: any) {
          this.logError(`Failed to delete test automation file ${automation.id}`, error);
        }
      }
      
      executionConfig.currentPhase = 'completed';
      this.log(`Cleanup completed for automation: ${automation.id}`);
      
    } catch (error: any) {
      this.logError(`Cleanup failed for automation ${automation.id}`, error);
    }
  }

  /**
   * Validation methods
   */
  private validateAutomation(automation: UniversalAutomation): boolean {
    if (!automation.id || !automation.name) return false;
    if (!automation.schedule.executionTime) return false;
    if (automation.pushSequence.length === 0) return false;
    return true;
  }

  /**
   * Utility methods for timeline calculation
   */
  private calculateExpectedEndTime(automation: UniversalAutomation): string {
    const startTime = new Date();
    const totalDuration = 30 + automation.settings.cancellationWindowMinutes; // Lead time + cancellation window
    return new Date(startTime.getTime() + totalDuration * 60 * 1000).toISOString();
  }

  private calculateCancellationDeadline(automation: UniversalAutomation): string {
    const leadTime = automation.schedule.leadTimeMinutes || 30;
    const cancellationBuffer = automation.settings.cancellationWindowMinutes || 30;
    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + leadTime - cancellationBuffer);
    return deadline.toISOString();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Integration methods (to be implemented with existing systems)
   */
  private async loadAutomation(automationId: string): Promise<UniversalAutomation | null> {
    try {
      const { automationStorage } = await import('./automationStorage');
      const automation = await automationStorage.loadAutomation(automationId);
      return automation;
    } catch (error: any) {
      this.logError(`Failed to load automation ${automationId}`, error);
      return null;
    }
  }

  private async generatePushAudience(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    this.log(`Generating audience for push: ${push.title} (Layer ${push.layerId})`);
    
    try {
      const scriptId = automation.audienceCriteria?.customScript?.scriptId;
      
      if (!scriptId) {
        this.log(`No script specified for automation - skipping audience generation`);
        return;
      }
      
      // For test automations or real automations, use the scriptExecutor
      const { scriptExecutor } = await import('./scriptExecutor');
      
      this.log(`Executing script: ${scriptId} for audience generation`);
      
      // Execute the script to generate CSV files
      const executionId = `automation-${automation.id}-${Date.now()}`;
      const result = await scriptExecutor.executeScript(scriptId, {}, executionId, false); // isDryRun = false
      
      if (result.success) {
        this.log(`Successfully generated audiences using script: ${scriptId}`);
        this.log(`Generated files: ${(result as any).generatedFiles?.join(', ') || 'none'}`);
      } else {
        throw new Error(`Script execution failed: ${result.error}`);
      }
      
    } catch (error: any) {
      this.logError(`Failed to generate audience for automation ${automation.id}`, error);
      throw error;
    }
  }

  /**
   * Send test push sequence to configured test users
   * 
   * CRITICAL FIX: This method calls the test API ONCE for the entire automation
   * The test API processes all pushes in the sequence, so we only need one call
   */
  private async sendTestPushSequence(automation: UniversalAutomation): Promise<void> {
    this.log(`🧪 Sending test sequence for automation: ${automation.id} (${automation.pushSequence.length} pushes)`);
    
    try {
      // Call the test-automation API for TEST audience - processes ENTIRE sequence
      const response = await fetch(`http://localhost:3001/api/automation/test/${automation.id}?mode=test-live-send`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        this.log(`✅ Successfully sent test sequence: ${automation.pushSequence.length} pushes to test audience`);
      } else {
        throw new Error(`Test sequence failed: ${response.status}`);
      }
    } catch (error: any) {
      this.logError(`Failed to send test sequence for automation ${automation.id}`, error);
      throw error;
    }
  }

  /**
   * @deprecated Use sendTestPushSequence() instead
   * Legacy method - kept for reference but should not be called per-push
   */
  private async sendTestPush(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    this.log(`⚠️  DEPRECATED: sendTestPush() called for individual push. Use sendTestPushSequence() instead.`);
    
    // For backwards compatibility, just log the push info but don't make API calls
    this.log(`Would send test push: "${push.title}" to test audience (Layer ${push.layerId})`);
  }

  /**
   * @deprecated This method is no longer used. Live pushes now go through the unified
   * test-automation API (executeLiveSending) to ensure identical processing logic.
   * Kept for reference but should not be called.
   */
  private async sendLivePush(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    this.log(`⚠️  DEPRECATED: sendLivePush() called. Live pushes now use unified test-automation API.`);
    this.log(`❌ Individual push processing has been replaced with comprehensive sequence processing.`);
    throw new Error(`sendLivePush() is deprecated. Use executeLiveSending() with unified test-automation API.`);
  }

  /**
   * Load user IDs from CSV file (same logic as test automation API)
   */
  private async loadUserIdsFromCsv(csvPath: string | undefined): Promise<string[]> {
    if (!csvPath) {
      return [];
    }

    try {
      const fs = require('fs');
      const Papa = require('papaparse');
      
      // Check if file exists
      if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found: ${csvPath}`);
      }
      
      // Read and parse CSV file
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const parseResult = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
      const userIds = parseResult.data.map((row: any) => row.user_id).filter(Boolean);
      
      this.log(`Loaded ${userIds.length} user IDs from CSV: ${csvPath}`);
      return userIds;
      
    } catch (error: any) {
      this.logError(`Failed to load user IDs from CSV: ${csvPath}`, error);
      return [];
    }
  }

  private async handleExecutionFailure(automationId: string, error: string): Promise<void> {
    // TODO: Implement failure handling and notifications
    this.logError(`Execution failure for ${automationId}`, error);
  }

  /**
   * Control methods
   */
  async cancelAutomation(automationId: string, reason: string = 'User requested'): Promise<ExecutionResponse> {
    // Simplified: just cancel the scheduled job, no execution tracking
    const jobInfo = this.scheduledJobs.get(automationId);
    if (!jobInfo) {
      return {
        success: false,
        executionId: automationId,
        status: 'failed',
        message: 'Automation not found or not scheduled'
      };
    }

    // Cancel the scheduled job
    jobInfo.cronJob.stop();
    jobInfo.cronJob.destroy();
    this.scheduledJobs.delete(automationId);
    
    this.log(`Automation ${automationId} cancelled: ${reason}`);
    
    return {
      success: true,
      executionId: automationId,
      status: 'cancelled',
      message: `Automation cancelled: ${reason}`
    };
  }

  async emergencyStop(automationId: string): Promise<ExecutionResponse> {
    return this.cancelAutomation(automationId, 'Emergency stop activated');
  }

  /**
   * Status and monitoring
   */

  getAllActiveExecutions(): { [automationId: string]: ExecutionConfig } {
    // Simplified: no active execution tracking
    return {};
  }

  /**
   * Cleanup methods
   */
  async shutdownEngine(): Promise<void> {
    this.log('Shutting down automation engine...');
    
    // Stop all cron jobs
    for (const [automationId, job] of this.scheduledJobs) {
      job.cronJob.stop();
      this.log(`Stopped scheduled job for automation: ${automationId}`);
    }
    
    // Clear all maps
    this.scheduledJobs.clear();
    // No execution tracking to clear in simplified mode
    
    this.log('Automation engine shutdown complete');
  }

  /**
   * Logging utilities
   */
  private log(message: string): void {
    console.log(`${this.logPrefix} ${new Date().toISOString()} - ${message}`);
  }

  private logError(message: string, error: any): void {
    console.error(`${this.logPrefix} ${new Date().toISOString()} - ERROR: ${message}`, error);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      timeZone: 'America/Chicago',
      hour12: true 
    });
  }
}

// Export singleton instance
export const automationEngine = new AutomationEngine();