import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { fetchDeviceTokens } from '../../../../lib/graphql';
import { admin, getPushClient } from '../../../../lib/firebaseAdmin';
import { validateVariables, processVariableReplacements } from '../../../../lib/variableProcessor';
import { addPushLog } from '../../../../lib/pushLogger';

interface CsvRow {
  user_id: string;
  [key: string]: string | number; // Allow additional dynamic columns
}

const isValidTradeblockUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname === 'tradeblock.us' || parsedUrl.hostname.endsWith('.tradeblock.us');
  } catch {
    return false;
  }
};

export async function POST(req: NextRequest) {
  console.log('=== PUSH NOTIFICATION API CALLED ===');
  
  try {
    const contentType = req.headers.get('content-type') || '';
    let file: File | null = null;
    let manualUserIds: string | null = null;
    let title: string | null = null;
    let body: string | null = null;
    let deepLink: string | null = null;

    if (contentType.includes('application/json')) {
      // Handle JSON requests
      const jsonData = await req.json();
      console.log('JSON data received:', jsonData);
      manualUserIds = jsonData.userIds || null;
      title = jsonData.title || null;
      body = jsonData.body || null;
      deepLink = jsonData.deepLink || null;
    } else {
      // Handle form data requests
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      manualUserIds = formData.get('userIds') as string | null;
      title = formData.get('title') as string | null;
      body = formData.get('body') as string | null;
      deepLink = formData.get('deepLink') as string | null;
    }

    console.log('Processed data:', {
      hasFile: !!file,
      manualUserIds,
      title,
      body,
      deepLink
    });

    if (!title || !body) {
      console.log('Missing title or body');
      return NextResponse.json({ success: false, message: 'Missing title or body' }, { status: 400 });
    }

    // Validate deep link if provided
    if (deepLink && !isValidTradeblockUrl(deepLink)) {
      console.log('Invalid deep link:', deepLink);
      return NextResponse.json({ success: false, message: 'Deep link must be a valid tradeblock.us URL' }, { status: 400 });
    }

    if (!file && !manualUserIds) {
      console.log('No file or manual user IDs provided');
      return NextResponse.json({ success: false, message: 'Please provide either a CSV file or manual user IDs' }, { status: 400 });
    }

    if (file && manualUserIds) {
      console.log('Both file and manual user IDs provided');
      return NextResponse.json({ success: false, message: 'Please provide either a CSV file or manual user IDs, not both' }, { status: 400 });
    }

    let userIds: string[] = [];
    let csvData: CsvRow[] = [];

    if (file) {
      console.log('Processing CSV file:', file.name);
      const text = await file.text();
      const result = Papa.parse(text, { header: true });
      csvData = result.data.filter(row => row && Object.keys(row).length > 0);
      userIds = csvData.map(row => row.user_id || row.userId).filter(Boolean);
      console.log('CSV data parsed:', csvData.length, 'rows');
      console.log('User IDs from CSV:', userIds);
    } else if (manualUserIds) {
      console.log('Processing manual user IDs:', manualUserIds);
      userIds = manualUserIds.split(',').map(id => id.trim()).filter(Boolean);
      // Create minimal CSV data for manual IDs
      csvData = userIds.map(id => ({ user_id: id }));
      console.log('Parsed user IDs:', userIds);
      if (userIds.length === 0 || userIds.length > 5) {
        console.log('Invalid number of user IDs:', userIds.length);
        return NextResponse.json({ success: false, message: 'Please provide between 1 and 5 valid user IDs.' }, { status: 400 });
      }
    }

    if (userIds.length === 0) {
      console.log('No user IDs found after processing');
      return NextResponse.json({ success: false, message: 'No user IDs found to send notifications to.' }, { status: 400 });
    }

    // Validate variables in title, body, and deep link
    const variableValidation = validateVariables(title, body, deepLink || undefined, csvData);
    if (!variableValidation.isValid) {
      console.log('Variable validation failed:', variableValidation.errors);
      return NextResponse.json({ 
        success: false, 
        message: `Variable validation failed: ${variableValidation.errors.join('; ')}`,
        details: {
          missingColumns: variableValidation.missingColumns,
          malformedVariables: variableValidation.malformedVariables
        }
      }, { status: 400 });
    }

    console.log('About to process notifications for user IDs:', userIds);

    // Process variable replacements if needed
    const variableReplacements = processVariableReplacements(title, body, deepLink || undefined, csvData);
    console.log('Variable replacements processed:', variableReplacements.length);

    // Create a map from userId to token for personalized messages
    const userTokenMap = new Map<string, string[]>();
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const tokensFromBatch = await fetchDeviceTokens([userId]);
      const tokens = tokensFromBatch.map(t => t.token);
      if (tokens.length > 0) {
        userTokenMap.set(userId, tokens);
      }
    }

    console.log('User token map created:', userTokenMap.size, 'users with tokens');

    // Send personalized notifications
    const messaging = getPushClient();
    let successCount = 0;
    const failedTokens: string[] = [];

    for (const replacement of variableReplacements) {
      const userTokens = userTokenMap.get(replacement.userId);
      if (!userTokens || userTokens.length === 0) {
        console.log(`No tokens found for user ${replacement.userId}`);
        continue;
      }

      console.log(`Sending personalized message to user ${replacement.userId}:`, {
        title: replacement.title,
        body: replacement.body,
        deepLink: replacement.deepLink
      });

      const message: admin.messaging.MulticastMessage = {
        notification: { 
          title: replacement.title, 
          body: replacement.body 
        },
        tokens: userTokens,
        ...(replacement.deepLink && {
          data: {
            click_action: replacement.deepLink,
            url: replacement.deepLink
          }
        })
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`Firebase response for user ${replacement.userId}:`, response);
      
      successCount += response.successCount;

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          console.log(`Token ${userTokens[idx]} failed:`, res.error);
          failedTokens.push(userTokens[idx]);
        }
      });
    }

    const totalTokens = Array.from(userTokenMap.values()).reduce((sum, tokens) => sum + tokens.length, 0);
    console.log('Final results - Success:', successCount, 'Failed:', failedTokens.length, 'Total tokens:', totalTokens);

    // Log the push notification
    try {
      const logData = {
        audienceDescription: `${userIds.length} user${userIds.length === 1 ? '' : 's'}${file ? ' from CSV upload' : ' manually entered'}`,
        audienceSize: userIds.length,
        title,
        body,
        deepLink,
        status: 'success' as const,
        successCount,
        totalCount: totalTokens
      };
      
      // Call logging function directly to avoid server-to-server fetch issues
      console.log('Logging push notification:', logData);
      addPushLog({
        ...logData,
        deepLink: logData.deepLink || undefined
      });
    } catch (logError) {
      console.error('Failed to log push notification:', logError);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successCount} of ${totalTokens} personalized notifications to ${variableReplacements.length} users.`,
      failedTokens: failedTokens.length > 0 ? failedTokens : undefined,
    });

  } catch (error: any) {
    console.error('ERROR in send-push API:', error);
    
    // Log failed push attempts
    try {
      addPushLog({
        audienceDescription: 'Failed push attempt',
        audienceSize: 0,
        title: title || 'Unknown',
        body: body || 'Unknown',
        deepLink: deepLink || undefined,
        status: 'failed',
        errorMessage: error.message || 'Unknown error'
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return NextResponse.json({ success: false, message: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
} 