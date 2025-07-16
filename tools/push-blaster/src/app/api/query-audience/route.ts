import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { queryUsers, fetchDataPacks, fetchManualAudienceData } from '@/lib/databaseQueries';

interface AudienceFilters {
  lastActiveDays?: number;
  tradedInLastDays?: number;
  notTradedInLastDays?: number;
  minLifetimeTrades?: number;
  maxLifetimeTrades?: number;
  hasTrustedTrader?: boolean;
  joinedAfterDate?: string;
}

interface DataPacks {
  topTargetShoe: boolean;
  hottestShoeTraded: boolean;
  hottestShoeOffers: boolean;
}

interface UserData {
  user_id: string;
  firstName?: string;
  username?: string;
  preferredSize?: string;
  top_target_shoe_name?: string;
  top_target_shoe_variantid?: string;
  hottest_shoe_traded_name?: string;
  hottest_shoe_traded_variantid?: string;
  hottest_shoe_traded_count?: number;
  hottest_shoe_offers_name?: string;
  hottest_shoe_offers_variantid?: string;
  hottest_shoe_offers_count?: number;
}

// Real database functions are now imported from databaseQueries.ts

export async function POST(req: NextRequest) {
  console.log('=== AUDIENCE QUERY API CALLED ===');
  
  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const {
      lastActiveDays,
      tradedInLastDays,
      notTradedInLastDays,
      minLifetimeTrades,
      maxLifetimeTrades,
      hasTrustedTrader,
      joinedAfterDate,
      dataPacks,
      manualUserIds
    } = body;
    
    // Validate data packs
    const dataPackOptions: DataPacks = {
      topTargetShoe: dataPacks?.topTargetShoe || false,
      hottestShoeTraded: dataPacks?.hottestShoeTraded || false,
      hottestShoeOffers: dataPacks?.hottestShoeOffers || false,
    };
    
    console.log('Processed data packs:', dataPackOptions);
    
    let userIds: string[];
    let userData: UserData[];
    
    // Check if this is a manual audience creation request
    if (manualUserIds && Array.isArray(manualUserIds) && manualUserIds.length > 0) {
      // Manual audience creation - skip filtering, just fetch data packs
      console.log('Manual audience creation for user IDs:', manualUserIds);
      userIds = manualUserIds;
      userData = await fetchManualAudienceData(userIds, dataPackOptions);
    } else {
      // Query-based audience creation
      const filters: AudienceFilters = {};
      
      if (lastActiveDays !== undefined) filters.lastActiveDays = lastActiveDays;
      if (tradedInLastDays !== undefined) filters.tradedInLastDays = tradedInLastDays;
      if (notTradedInLastDays !== undefined) filters.notTradedInLastDays = notTradedInLastDays;
      if (minLifetimeTrades !== undefined) filters.minLifetimeTrades = minLifetimeTrades;
      if (maxLifetimeTrades !== undefined) filters.maxLifetimeTrades = maxLifetimeTrades;
      if (hasTrustedTrader !== undefined) filters.hasTrustedTrader = hasTrustedTrader;
      if (joinedAfterDate) filters.joinedAfterDate = joinedAfterDate;
      
      console.log('Processed filters:', filters);
      
      // Query users based on filters
      userIds = await queryUsers(filters);
      console.log('Found user IDs:', userIds);
      
      if (userIds.length === 0) {
        return NextResponse.json({
          success: true,
          message: 'No users found matching the specified criteria.',
          userCount: 0,
          csvData: ''
        });
      }
      
      // Fetch data packs for users
      userData = await fetchDataPacks(userIds, dataPackOptions);
    }
    console.log('User data with packs:', userData);
    
    // Filter out users missing required data pack information
    const filteredUsers = userData.filter(user => {
      if (dataPackOptions.topTargetShoe && (!user.top_target_shoe_name || !user.top_target_shoe_variantid)) {
        console.log(`Filtering out user ${user.user_id} - missing top target shoe data`);
        return false;
      }
      if (dataPackOptions.hottestShoeTraded && (!user.hottest_shoe_traded_name || !user.hottest_shoe_traded_variantid)) {
        console.log(`Filtering out user ${user.user_id} - missing hottest traded shoe data`);
        return false;
      }
      if (dataPackOptions.hottestShoeOffers && (!user.hottest_shoe_offers_name || !user.hottest_shoe_offers_variantid)) {
        console.log(`Filtering out user ${user.user_id} - missing hottest offers shoe data`);
        return false;
      }
      return true;
    });
    
    console.log(`Filtered to ${filteredUsers.length} users with complete data`);
    
    // Generate CSV
    const csvData = Papa.unparse(filteredUsers);
    
    // Generate audience description
    let audienceDescription: string;
    if (manualUserIds && Array.isArray(manualUserIds) && manualUserIds.length > 0) {
      // Manual audience description
      audienceDescription = `Manual audience (${manualUserIds.length} user IDs)`;
    } else {
      // Query-based audience description
      const filterDescriptions = [];
      if (lastActiveDays) filterDescriptions.push(`active in last ${lastActiveDays} days`);
      if (tradedInLastDays) filterDescriptions.push(`traded in last ${tradedInLastDays} days`);
      if (notTradedInLastDays) filterDescriptions.push(`not traded in last ${notTradedInLastDays} days`);
      if (minLifetimeTrades) filterDescriptions.push(`min ${minLifetimeTrades} lifetime trades`);
      if (maxLifetimeTrades) filterDescriptions.push(`max ${maxLifetimeTrades} lifetime trades`);
      if (hasTrustedTrader) filterDescriptions.push('trusted traders');
      if (joinedAfterDate) filterDescriptions.push(`joined after ${joinedAfterDate}`);
      
      audienceDescription = `Users with ${filterDescriptions.join(', ')}`;
    }
    
    const packDescriptions = [];
    if (dataPackOptions.topTargetShoe) packDescriptions.push('TOP TARGET SHOE');
    if (dataPackOptions.hottestShoeTraded) packDescriptions.push('YOUR HOTTEST SHOE - TRADES');
    if (dataPackOptions.hottestShoeOffers) packDescriptions.push('YOUR HOTTEST SHOE - OFFERS');
    
    if (packDescriptions.length > 0) {
      audienceDescription += ` + data packs: ${packDescriptions.join(', ')}`;
    }
    
    return NextResponse.json({
      success: true,
      message: `Successfully generated audience CSV with ${filteredUsers.length} users.`,
      userCount: filteredUsers.length,
      csvData,
      audienceDescription
    });
    
  } catch (error: any) {
    console.error('ERROR in query-audience API:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'An internal server error occurred.' 
    }, { status: 500 });
  }
} 