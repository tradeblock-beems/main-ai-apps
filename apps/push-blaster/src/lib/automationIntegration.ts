// Automation Integration Layer
// Connects automation engine with existing push-blaster and push-cadence-service

import { UniversalAutomation, AutomationPush } from '@/types/automation';
import { automationLogger } from './automationLogger';

export class AutomationIntegration {
  private logPrefix = '[AutomationIntegration]';
  private cadenceServiceUrl = 'http://localhost:3002';
  private pushBlasterApiUrl = 'http://localhost:3001';

  /**
   * Generate audience for automation push using existing query-audience API
   */
  async generateAudience(automation: UniversalAutomation, push?: AutomationPush): Promise<{
    success: boolean;
    audienceSize: number;
    csvPath?: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      
      // Use automation's audience criteria or push-specific query
      const audienceCriteria = push?.audienceQuery ? 
        JSON.parse(push.audienceQuery) : automation.audienceCriteria;

      // Call existing query-audience API
      const response = await fetch(`${this.pushBlasterApiUrl}/api/query-audience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityDays: audienceCriteria.activityDays,
          tradingDays: audienceCriteria.tradingDays,
          minTrades: audienceCriteria.minTrades,
          trustedTraderStatus: audienceCriteria.trustedTraderStatus,
          trustedTraderCandidate: audienceCriteria.trustedTraderCandidate,
          dataPacks: audienceCriteria.dataPacks
        })
      });

      if (!response.ok) {
        throw new Error(`Audience generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      automationLogger.logPerformance(
        automation.id, 
        'audience_generation', 
        'generate_audience', 
        startTime,
        { audienceSize: result.audienceSize }
      );

      return {
        success: true,
        audienceSize: result.audienceSize || 0,
        csvPath: result.csvFilePath
      };

    } catch (error: any) {
      automationLogger.logError(automation.id, 'audience_generation', 'Failed to generate audience', error);
      return {
        success: false,
        audienceSize: 0,
        error: error.message
      };
    }
  }

  /**
   * Filter audience through push-cadence-service Layer filtering
   */
  async filterAudienceWithCadence(automation: UniversalAutomation, push: AutomationPush, userIds: string[]): Promise<{
    success: boolean;
    eligibleUserIds: string[];
    excludedCount: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Call push-cadence-service filter-audience API
      const response = await fetch(`${this.cadenceServiceUrl}/api/filter-audience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds,
          layerId: push.layerId
        })
      });

      if (!response.ok) {
        throw new Error(`Cadence filtering failed: ${response.statusText}`);
      }

      const result = await response.json();

      automationLogger.logPerformance(
        automation.id,
        'audience_filtering',
        'cadence_filter',
        startTime,
        { 
          originalSize: userIds.length,
          filteredSize: result.eligibleUserIds?.length || 0,
          excludedCount: result.excludedCount || 0
        }
      );

      return {
        success: true,
        eligibleUserIds: result.eligibleUserIds || [],
        excludedCount: result.excludedCount || 0
      };

    } catch (error: any) {
      automationLogger.logError(automation.id, 'audience_filtering', 'Cadence filtering failed', error);
      
      // Fail open - return original audience if cadence service is down
      automationLogger.log('warn', automation.id, 'audience_filtering', 'Cadence service unavailable, proceeding without filtering');
      
      return {
        success: true,
        eligibleUserIds: userIds,
        excludedCount: 0,
        error: `Cadence service unavailable: ${error.message}`
      };
    }
  }

  /**
   * Send push notification using existing send-push API
   */
  async sendPush(automation: UniversalAutomation, push: AutomationPush, userIds: string[], isDryRun: boolean = false): Promise<{
    success: boolean;
    sentCount: number;
    failureCount: number;
    jobId?: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Create CSV data for the push
      const csvData = userIds.map(userId => ({ user_id: userId }));
      const csvContent = this.createCsvContent(csvData);

      // Create FormData similar to existing send-push flow
      const formData = new FormData();
      formData.append('pushTitle', push.title);
      formData.append('pushBody', push.body);
      formData.append('deepLink', push.deepLink);
      formData.append('layerId', push.layerId.toString());
      formData.append('isDryRun', isDryRun.toString());
      
      // Create blob for CSV file
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      formData.append('csvFile', csvBlob, `automation_${automation.id}_${push.id}.csv`);

      // Call existing send-push API
      const response = await fetch(`${this.pushBlasterApiUrl}/api/send-push`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Push sending failed: ${response.statusText}`);
      }

      const result = await response.json();

      // Track notification with cadence service if not dry run
      if (!isDryRun && result.success) {
        await this.trackNotifications(automation, push, userIds);
      }

      automationLogger.logPerformance(
        automation.id,
        'push_sending',
        isDryRun ? 'dry_run' : 'live_send',
        startTime,
        {
          pushId: push.id,
          audienceSize: userIds.length,
          sentCount: result.totalCount || 0
        }
      );

      return {
        success: result.success,
        sentCount: result.totalCount || 0,
        failureCount: 0, // TODO: Extract from result if available
        jobId: result.jobId
      };

    } catch (error: any) {
      automationLogger.logError(automation.id, 'push_sending', 'Push sending failed', error, {
        pushId: push.id,
        isDryRun
      });

      return {
        success: false,
        sentCount: 0,
        failureCount: userIds.length,
        error: error.message
      };
    }
  }

  /**
   * Track notifications with push-cadence-service
   */
  private async trackNotifications(automation: UniversalAutomation, push: AutomationPush, userIds: string[]): Promise<void> {
    try {
      // Track each user notification individually
      const trackingPromises = userIds.map(userId =>
        fetch(`${this.cadenceServiceUrl}/api/track-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            layerId: push.layerId,
            notificationId: `${automation.id}_${push.id}`,
            pushTitle: push.title,
            isDryRun: false
          })
        })
      );

      // Execute tracking in batches to avoid overwhelming the service
      const batchSize = 100;
      for (let i = 0; i < trackingPromises.length; i += batchSize) {
        const batch = trackingPromises.slice(i, i + batchSize);
        await Promise.all(batch);
      }

      automationLogger.log('info', automation.id, 'tracking', 'Notifications tracked', {
        pushId: push.id,
        userCount: userIds.length
      });

    } catch (error: any) {
      automationLogger.logError(automation.id, 'tracking', 'Notification tracking failed', error);
      // Don't fail the push if tracking fails
    }
  }

  /**
   * Load existing scheduled pushes for migration
   */
  async loadScheduledPushes(): Promise<any[]> {
    try {
      const response = await fetch(`${this.pushBlasterApiUrl}/api/scheduled-pushes`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to load scheduled pushes: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];

    } catch (error: any) {
      this.log(`Failed to load scheduled pushes: ${error.message}`);
      return [];
    }
  }

  /**
   * Get push logs for tracking integration
   */
  async getPushLogs(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(`${this.pushBlasterApiUrl}/api/push-logs?limit=${limit}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Failed to load push logs: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || [];

    } catch (error: any) {
      this.log(`Failed to load push logs: ${error.message}`);
      return [];
    }
  }

  /**
   * Utility methods
   */
  private createCsvContent(data: any[]): string {
    if (data.length === 0) return 'user_id\n';
    
    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    const dataRows = data.map(row => 
      headers.map(header => row[header] || '').join(',')
    );
    
    return [headerRow, ...dataRows].join('\n');
  }

  /**
   * Health check for dependent services
   */
  async checkServiceHealth(): Promise<{
    pushBlaster: boolean;
    cadenceService: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let pushBlasterHealthy = false;
    let cadenceServiceHealthy = false;

    // Check push-blaster health
    try {
      const response = await fetch(`${this.pushBlasterApiUrl}/api/push-logs?limit=1`);
      pushBlasterHealthy = response.ok;
    } catch (error: any) {
      errors.push(`Push-blaster unavailable: ${error.message}`);
    }

    // Check cadence service health
    try {
      const response = await fetch(`${this.cadenceServiceUrl}/api/filter-audience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: [], layerId: 1 })
      });
      cadenceServiceHealthy = response.ok;
    } catch (error: any) {
      errors.push(`Cadence service unavailable: ${error.message}`);
    }

    return {
      pushBlaster: pushBlasterHealthy,
      cadenceService: cadenceServiceHealthy,
      errors
    };
  }

  private log(message: string): void {
    console.log(`${this.logPrefix} ${new Date().toISOString()} - ${message}`);
  }
}

// Export singleton instance
export const automationIntegration = new AutomationIntegration();