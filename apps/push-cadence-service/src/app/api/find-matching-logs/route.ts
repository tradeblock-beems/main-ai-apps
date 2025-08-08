import { NextRequest, NextResponse } from 'next/server';
import { findMatchingTrackResults } from '@/lib/cadence';

// Add CORS headers
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export async function OPTIONS() {
    return NextResponse.json({}, { status: 200, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
    try {
        const { csvAudienceSize, trackResultsLogs } = await req.json();
        
        if (!csvAudienceSize || !trackResultsLogs || !Array.isArray(trackResultsLogs)) {
            return NextResponse.json({ 
                success: false, 
                error: 'csvAudienceSize (number) and trackResultsLogs (array) are required' 
            }, { status: 400 });
        }

        const matchingLogs = await findMatchingTrackResults(csvAudienceSize, trackResultsLogs);

        return NextResponse.json({ 
            success: true, 
            matchingLogs,
            message: `Found ${matchingLogs.length} potential matches`
        }, { headers: corsHeaders() });

    } catch (error: any) {
        console.error('Error in find-matching-logs API:', error);
        return NextResponse.json({ 
            success: false, 
            error: 'Failed to find matching logs',
            details: error.message 
        }, { status: 500, headers: corsHeaders() });
    }
}