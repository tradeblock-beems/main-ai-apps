// Simple health check endpoint with no heavy imports
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    memoryUsage: process.memoryUsage()
  });
}