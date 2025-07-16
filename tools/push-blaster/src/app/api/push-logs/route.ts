import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface PushLog {
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
const readLogs = (): PushLog[] => {
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
const writeLogs = (logs: PushLog[]) => {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error writing logs:', error);
  }
};

// GET - Retrieve all logs
export async function GET() {
  try {
    const logs = readLogs();
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to retrieve logs' 
    }, { status: 500 });
  }
}

// POST - Add a new log entry
export async function POST(req: NextRequest) {
  try {
    const logData = await req.json();
    
    const newLog: PushLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      audienceDescription: logData.audienceDescription || 'Manual user IDs',
      audienceSize: logData.audienceSize || 0,
      title: logData.title,
      body: logData.body,
      deepLink: logData.deepLink,
      status: logData.status,
      successCount: logData.successCount,
      totalCount: logData.totalCount,
      errorMessage: logData.errorMessage
    };

    const logs = readLogs();
    logs.unshift(newLog); // Add to beginning (newest first)
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(100);
    }
    
    writeLogs(logs);
    
    return NextResponse.json({ success: true, log: newLog });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Failed to add log entry' 
    }, { status: 500 });
  }
} 