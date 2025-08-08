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
  private activeExecutions: Map<string, ExecutionConfig> = new Map();
  private logPrefix = '[AutomationEngine]';

  constructor() {
    this.log('Automation Engine initialized');
  }

  /**
   * Schedule an automation for execution
   * Builds on existing scheduling patterns from push-blaster
   */
  async scheduleAutomation(automation: UniversalAutomation): Promise<{ success: boolean; message: string }> {
    try {
      // Validate automation
      if (!this.validateAutomation(automation)) {
        throw new Error('Invalid automation configuration');
      }

      // Convert schedule to cron expression
      const cronExpression = this.buildCronExpression(automation);
      
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
        await this.executeAutomation(automation.id);
      }, {
        scheduled: false,
        timezone: automation.schedule.timezone || 'America/New_York'
      });

      // Store the scheduled job
      this.scheduledJobs.set(automation.id, {
        automationId: automation.id,
        cronJob,
        executionConfig
      });

      // Start the job
      cronJob.start();

      this.log(`Automation ${automation.id} scheduled with cron: ${cronExpression}`);
      
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

      this.activeExecutions.set(automationId, executionConfig);

      // Execute the timeline
      await this.executeTimeline(automation, executionConfig);

    } catch (error: any) {
      this.logError(`Automation execution failed for ${automationId}`, error);
      await this.handleExecutionFailure(automationId, error.message);
    }
  }

  /**
   * Execute the automation timeline phases
   */
  private async executeTimeline(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    // Phase 1: Audience Generation (T-30 minutes)
    await this.executeAudienceGeneration(automation, executionConfig);
    
    // Phase 2: Test Push Sending (T-25 minutes) 
    await this.executeTestSending(automation, executionConfig);
    
    // Phase 3: Cancellation Window (T-25 to T-0)
    await this.executeCancellationWindow(automation, executionConfig);
    
    // Phase 4: Live Execution (T-0)
    await this.executeLiveSending(automation, executionConfig);
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
   */
  private async executeTestSending(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`Sending test pushes for automation: ${automation.id}`);
    executionConfig.currentPhase = 'test_sending';

    try {
      if (automation.settings.dryRunFirst && automation.settings.testUserIds.length > 0) {
        for (const push of automation.pushSequence) {
          await this.sendTestPush(automation, push);
        }
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

    return new Promise((resolve, reject) => {
      const monitor = setInterval(() => {
        const now = new Date();
        
        // Check for emergency stop
        if (executionConfig.emergencyStopRequested) {
          clearInterval(monitor);
          reject(new Error('Emergency stop requested'));
          return;
        }
        
        // Check if cancellation window has expired
        if (now >= cancellationDeadline) {
          clearInterval(monitor);
          executionConfig.canCancel = false;
          this.log(`Cancellation window closed for automation: ${automation.id}`);
          resolve();
          return;
        }
      }, checkInterval);
    });
  }

  /**
   * Execute live push sending
   */
  private async executeLiveSending(automation: UniversalAutomation, executionConfig: ExecutionConfig): Promise<void> {
    this.log(`Starting live execution for automation: ${automation.id}`);
    executionConfig.currentPhase = 'live_execution';

    try {
      for (const [index, push] of automation.pushSequence.entries()) {
        // Apply sequence timing delays
        if (index > 0 && push.timing.delayAfterPrevious > 0) {
          await this.delay(push.timing.delayAfterPrevious * 60 * 1000);
        }

        await this.sendLivePush(automation, push);
      }

      executionConfig.currentPhase = 'completed';
      this.log(`Automation execution completed: ${automation.id}`);
      
    } catch (error: any) {
      throw new Error(`Live execution failed: ${error.message}`);
    }
  }

  /**
   * Build cron expression from automation schedule
   */
  private buildCronExpression(automation: UniversalAutomation): string {
    const schedule = automation.schedule;
    
    if (schedule.cronExpression) {
      return schedule.cronExpression;
    }

    // Parse execution time (HH:MM)
    const [hours, minutes] = schedule.executionTime.split(':').map(Number);

    switch (schedule.frequency) {
      case 'once':
        // For one-time execution, we'll use the start date
        const startDate = new Date(schedule.startDate);
        return `${minutes} ${hours} ${startDate.getDate()} ${startDate.getMonth() + 1} *`;
      
      case 'daily':
        return `${minutes} ${hours} * * *`;
      
      case 'weekly':
        // Default to Monday (1), can be extended for specific days
        return `${minutes} ${hours} * * 1`;
      
      case 'monthly':
        // Default to 1st of month, can be extended
        return `${minutes} ${hours} 1 * *`;
      
      default:
        throw new Error(`Unsupported schedule frequency: ${schedule.frequency}`);
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
    const cancellationBuffer = automation.settings.cancellationWindowMinutes || 25;
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
    // TODO: Integrate with automation storage system
    throw new Error('Not implemented: loadAutomation');
  }

  private async generatePushAudience(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    // TODO: Integrate with existing audience generation API
    throw new Error('Not implemented: generatePushAudience');
  }

  private async sendTestPush(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    // TODO: Integrate with existing send-push API (dry run mode)
    throw new Error('Not implemented: sendTestPush');
  }

  private async sendLivePush(automation: UniversalAutomation, push: AutomationPush): Promise<void> {
    // TODO: Integrate with existing send-push API
    throw new Error('Not implemented: sendLivePush');
  }

  private async handleExecutionFailure(automationId: string, error: string): Promise<void> {
    // TODO: Implement failure handling and notifications
    this.logError(`Execution failure for ${automationId}`, error);
  }

  /**
   * Control methods
   */
  async cancelAutomation(automationId: string, reason: string = 'User requested'): Promise<ExecutionResponse> {
    const execution = this.activeExecutions.get(automationId);
    if (!execution) {
      return {
        success: false,
        executionId: automationId,
        status: 'failed',
        message: 'Automation not found or not running'
      };
    }

    if (!execution.canCancel) {
      return {
        success: false,
        executionId: automationId,
        status: 'running',
        message: 'Cancellation window has expired'
      };
    }

    execution.emergencyStopRequested = true;
    execution.currentPhase = 'failed';
    
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
  getExecutionStatus(automationId: string): ExecutionConfig | null {
    return this.activeExecutions.get(automationId) || null;
  }

  getAllActiveExecutions(): { [automationId: string]: ExecutionConfig } {
    return Object.fromEntries(this.activeExecutions);
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
    this.activeExecutions.clear();
    
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
}

// Export singleton instance
export const automationEngine = new AutomationEngine();