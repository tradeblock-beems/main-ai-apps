import fs from 'fs';
import path from 'path';

export interface PushLog {
  id: string;
  timestamp: string;
  audienceDescription: string;
  audienceSize: number;
  title: string;
  body: string;
  deepLink?: string;
  status: 'success' | 'failed';
  successCount?: number;
  totalCount?: number;
  errorMessage?: string;
}

const LOGS_FILE = path.join(process.cwd(), 'push-logs.json');

// Ensure logs file exists
const ensureLogsFile = () => {
  if (!fs.existsSync(LOGS_FILE)) {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
  }
};

// Read logs from file
export const readLogs = (): PushLog[] => {
  try {
    ensureLogsFile();
    const data = fs.readFileSync(LOGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

// Write logs to file
export const writeLogs = (logs: PushLog[]) => {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing logs:', error);
  }
};

// Add a new log entry
export const addPushLog = (logData: Omit<PushLog, 'id' | 'timestamp'>): PushLog => {
  const newLog: PushLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    ...logData
  };

  const logs = readLogs();
  logs.unshift(newLog); // Add to beginning (newest first)
  
  // Keep only last 100 logs
  if (logs.length > 100) {
    logs.splice(100);
  }
  
  writeLogs(logs);
  
  return newLog;
}; 