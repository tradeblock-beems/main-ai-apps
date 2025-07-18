import { spawn } from 'child_process';
import path from 'path';

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

/**
 * Execute database query via Python script using our established sql_utils.py infrastructure
 * This directly executes Python without nested API calls
 */
async function executeQuery(query: string, params: any[] = []): Promise<any[]> {
  const pythonScript = `
import sys
import os
import json

# Use current working directory as project root (set by spawn)
project_root = os.getcwd()
sys.path.insert(0, project_root)

try:
    from basic_capabilities.internal_db_queries_toolbox.sql_utils import execute_query
    
    # Get query and params from command line arguments
    query = sys.argv[1]
    params_json = sys.argv[2] if len(sys.argv) > 2 else '[]'
    params = json.loads(params_json)
    
    # Execute the query using our established infrastructure
    result = execute_query(query, params if params else None)
    
    if result is None:
        print(json.dumps({"error": "Query execution failed"}))
        sys.exit(1)
    
    # Convert result to JSON-serializable format
    json_result = []
    for row in result:
        if hasattr(row, '_asdict'):
            # Handle named tuples
            json_result.append(row._asdict())
        elif hasattr(row, 'keys'):
            # Handle dict-like objects
            json_result.append(dict(row))
        else:
            # Handle regular tuples/lists
            json_result.append(row)
    
    print(json.dumps({"data": json_result}))
    
except Exception as e:
    import traceback
    error_info = {
        "error": str(e),
        "traceback": traceback.format_exc(),
        "python_path": sys.path[:3],
        "cwd": os.getcwd()
    }
    print(json.dumps(error_info))
    sys.exit(1)
`;

  try {
    const result = await new Promise<any>((resolve, reject) => {
      // Determine the correct project root path
      const projectRoot = process.env.NODE_ENV === 'development' 
        ? path.resolve(process.cwd(), '../..') 
        : '/app'; // For production deployment
        
      const python = spawn('python3', ['-c', pythonScript, query, JSON.stringify(params)], {
        cwd: projectRoot,
        env: {
          ...process.env,
          PYTHONPATH: projectRoot,
        }
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', (code) => {
        if (code !== 0) {
          console.error('Python script error:', stderr);
          reject(new Error(`Python script exited with code ${code}: ${stderr}`));
          return;
        }

        try {
          const jsonResult = JSON.parse(stdout.trim());
          if (jsonResult.error) {
            reject(new Error(jsonResult.error));
          } else {
            resolve(jsonResult);
          }
        } catch (parseError) {
          console.error('Failed to parse Python output:', stdout);
          reject(new Error(`Failed to parse Python output: ${parseError}`));
        }
      });
    });

    return result.data || [];
  } catch (error) {
    console.error('Error executing database query:', error);
    throw error;
  }
}

/**
 * Query users based on filtering criteria using established database patterns
 */
export const queryUsers = async (filters: AudienceFilters): Promise<string[]> => {
  console.log('Real database query - filtering users with:', filters);
  
  try {
    // Build dynamic WHERE clauses based on filters
    const whereClauses: string[] = [];

    // Base filters for active users (standard pattern)
    whereClauses.push('u.deleted_at = 0');
    
    // User activity filtering using user_activities table
    if (filters.lastActiveDays) {
      whereClauses.push(`ua.last_active >= NOW() - INTERVAL '${filters.lastActiveDays} days'`);
    }

    // Trading activity filters using offers and trades
    if (filters.tradedInLastDays) {
      whereClauses.push(`
        EXISTS (
          SELECT 1 FROM offers o 
          JOIN trades t ON o.id = t.offer_id 
          WHERE (o.creator_user_id = u.id OR o.receiver_user_id = u.id)
          AND t.validation_passed_date IS NOT NULL
          AND t.validation_passed_date >= NOW() - INTERVAL '${filters.tradedInLastDays} days'
        )
      `);
    }

    if (filters.notTradedInLastDays) {
      whereClauses.push(`
        NOT EXISTS (
          SELECT 1 FROM offers o 
          JOIN trades t ON o.id = t.offer_id 
          WHERE (o.creator_user_id = u.id OR o.receiver_user_id = u.id)
          AND t.validation_passed_date IS NOT NULL
          AND t.validation_passed_date >= NOW() - INTERVAL '${filters.notTradedInLastDays} days'
        )
      `);
    }

    // Lifetime trades filtering using completed_trades_count
    if (filters.minLifetimeTrades) {
      whereClauses.push(`u.completed_trades_count >= ${filters.minLifetimeTrades}`);
    }

    if (filters.maxLifetimeTrades) {
      whereClauses.push(`u.completed_trades_count <= ${filters.maxLifetimeTrades}`);
    }

    // Trusted trader status
    if (filters.hasTrustedTrader !== undefined) {
      whereClauses.push(`u.is_trusted_trader = ${filters.hasTrustedTrader}`);
    }

    // Account age filtering
    if (filters.joinedAfterDate) {
      whereClauses.push(`u.created_at >= '${filters.joinedAfterDate}'`);
    }

    const query = `
      SELECT DISTINCT u.id::text as user_id
      FROM users u
      LEFT JOIN user_activities ua ON u.id = ua.user_id
      LEFT JOIN user_admin_information uai ON u.id = uai.user_id
      WHERE ${whereClauses.join(' AND ')}
      AND (uai.freeze_reason IS NULL OR uai.freeze_reason = '')
      ORDER BY u.id
      LIMIT 1000
    `;

    const result = await executeQuery(query);
    return result.map((row: any) => row.user_id);

  } catch (error) {
    console.error('Error in queryUsers:', error);
    throw new Error(`Failed to query users: ${error}`);
  }
};

/**
 * Fetch data packs for specific user IDs using established query patterns
 */
export const fetchDataPacks = async (userIds: string[], dataPacks: DataPacks): Promise<UserData[]> => {
  console.log('Real database query - fetching data packs for users:', userIds, 'with packs:', dataPacks);
  
  if (userIds.length === 0) {
    return [];
  }

  try {
    // Base user data with firstName, username, and size preferences (Pattern #7 from building blocks)
    const placeholders = userIds.map(() => '%s').join(', ');
    const baseUserQuery = `
      WITH user_size_preferences AS (
        SELECT
          up.user_id,
          av.value AS shoe_size
        FROM user_preferences up
        JOIN attribute_preferences ap ON up.id = ap.user_preference_id
        JOIN attributes a ON ap.attribute_id = a.id
        JOIN attribute_values av ON ap.attribute_value_id = av.id
        WHERE a.name = 'mens_size' AND ap.preferred = TRUE
      )
      SELECT 
        u.id::text as user_id,
        u.first_name as "firstName",
        u.username,
        usp.shoe_size as "preferredSize"
      FROM users u
      LEFT JOIN user_size_preferences usp ON u.id = usp.user_id
      WHERE u.id::text IN (${placeholders})
      AND u.deleted_at = 0
    `;

    const baseUsers = await executeQuery(baseUserQuery, userIds);
    
    // Create user map for building final results
    const userMap: { [key: string]: UserData } = {};
    baseUsers.forEach((user: any) => {
      userMap[user.user_id] = {
        user_id: user.user_id,
        firstName: user.firstName,
        username: user.username,
        preferredSize: user.preferredSize
      };
    });

    // Fetch top target shoe data using 3-tier fallback strategy (Pattern #14 from building blocks)
    if (dataPacks.topTargetShoe) {
      // Tier 1: Desired items (highest intent)
      const tier1Query = `
        WITH ranked_desired_items AS (
          SELECT
            di.user_id::text,
            di.product_variant_id::text,
            p.name as product_name,
            ROW_NUMBER() OVER(
              PARTITION BY di.user_id 
              ORDER BY di.offers_count DESC, di.created_at DESC
            ) as rn
          FROM desired_items di
          JOIN product_variants pv ON di.product_variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
          WHERE di.user_id::text IN (${placeholders})
          AND di.deleted_at = 0
        )
        SELECT
          user_id,
          product_variant_id,
          product_name
        FROM ranked_desired_items
        WHERE rn = 1
      `;

      const tier1Results = await executeQuery(tier1Query, userIds);
      const coveredUsers = new Set<string>();
      
      tier1Results.forEach((row: any) => {
        if (userMap[row.user_id]) {
          userMap[row.user_id].top_target_shoe_name = row.product_name;
          userMap[row.user_id].top_target_shoe_variantid = row.product_variant_id;
          coveredUsers.add(row.user_id);
        }
      });

      // Tier 2: Recent offers for uncovered users (medium intent)
      const uncoveredUsers = userIds.filter(uid => !coveredUsers.has(uid));
      if (uncoveredUsers.length > 0) {
        const uncoveredPlaceholders = uncoveredUsers.map(() => '%s').join(', ');
        const tier2Query = `
          WITH ranked_offers AS (
            SELECT
              o.creator_user_id::text as user_id,
              oi.product_variant_id::text,
              p.name as product_name,
              ROW_NUMBER() OVER (
                PARTITION BY o.creator_user_id 
                ORDER BY o.created_at DESC
              ) as rn
            FROM offers o
            JOIN offer_items oi ON o.id = oi.offer_id
            JOIN product_variants pv ON oi.product_variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            WHERE o.creator_user_id::text IN (${uncoveredPlaceholders})
          )
          SELECT user_id, product_variant_id, product_name
          FROM ranked_offers
          WHERE rn = 1
        `;

        const tier2Results = await executeQuery(tier2Query, uncoveredUsers);
        tier2Results.forEach((row: any) => {
          if (userMap[row.user_id]) {
            userMap[row.user_id].top_target_shoe_name = row.product_name;
            userMap[row.user_id].top_target_shoe_variantid = row.product_variant_id;
            coveredUsers.add(row.user_id);
          }
        });
      }

      // Tier 3: Wishlist items for still uncovered users (low intent, but something)
      const stillUncoveredUsers = userIds.filter(uid => !coveredUsers.has(uid));
      if (stillUncoveredUsers.length > 0) {
        const stillUncoveredPlaceholders = stillUncoveredUsers.map(() => '%s').join(', ');
        const tier3Query = `
          WITH ranked_wishlist AS (
            SELECT
              wi.user_id::text,
              wi.product_variant_id::text,
              p.name as product_name,
              ROW_NUMBER() OVER (
                PARTITION BY wi.user_id 
                ORDER BY wi.created_at DESC
              ) as rn
            FROM wishlist_items wi
            JOIN product_variants pv ON wi.product_variant_id = pv.id
            JOIN products p ON pv.product_id = p.id
            WHERE wi.user_id::text IN (${stillUncoveredPlaceholders})
            AND wi.deleted_at = 0
          )
          SELECT user_id, product_variant_id, product_name
          FROM ranked_wishlist
          WHERE rn = 1
        `;

        const tier3Results = await executeQuery(tier3Query, stillUncoveredUsers);
        tier3Results.forEach((row: any) => {
          if (userMap[row.user_id]) {
            userMap[row.user_id].top_target_shoe_name = row.product_name;
            userMap[row.user_id].top_target_shoe_variantid = row.product_variant_id;
          }
        });
      }
    }

    // Fetch hottest shoe traded data (30-day trading activity)
    if (dataPacks.hottestShoeTraded) {
      const hottestTradedQuery = `
        WITH user_trading_activity AS (
          SELECT 
            CASE 
              WHEN o.creator_user_id::text IN (${placeholders}) THEN o.creator_user_id
              WHEN o.receiver_user_id::text IN (${placeholders}) THEN o.receiver_user_id
            END as user_id,
            oi.product_variant_id,
            COUNT(*) as trade_count
          FROM offers o
          JOIN offer_items oi ON o.id = oi.offer_id
          JOIN trades t ON o.id = t.offer_id
          WHERE (o.creator_user_id::text IN (${placeholders}) OR o.receiver_user_id::text IN (${placeholders}))
          AND t.validation_passed_date IS NOT NULL
          AND t.validation_passed_date >= NOW() - INTERVAL '30 days'
          GROUP BY user_id, oi.product_variant_id
        ),
        ranked_trading AS (
          SELECT 
            uta.user_id::text,
            uta.product_variant_id::text,
            p.name as product_name,
            uta.trade_count,
            ROW_NUMBER() OVER(
              PARTITION BY uta.user_id 
              ORDER BY uta.trade_count DESC, p.name
            ) as rn
          FROM user_trading_activity uta
          JOIN product_variants pv ON uta.product_variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
        )
        SELECT 
          user_id,
          product_variant_id,
          product_name,
          trade_count
        FROM ranked_trading
        WHERE rn = 1
      `;

      // Proper parameter handling - duplicate userIds for each IN clause
      const tradedParams = [...userIds, ...userIds, ...userIds, ...userIds];
      const hottestTradedResults = await executeQuery(hottestTradedQuery, tradedParams);
      hottestTradedResults.forEach((row: any) => {
        if (userMap[row.user_id]) {
          userMap[row.user_id].hottest_shoe_traded_name = row.product_name;
          userMap[row.user_id].hottest_shoe_traded_variantid = row.product_variant_id;
          userMap[row.user_id].hottest_shoe_traded_count = parseInt(row.trade_count);
        }
      });
    }

    // Fetch hottest shoe offers data (7-day offer activity)
    if (dataPacks.hottestShoeOffers) {
      const hottestOffersQuery = `
        WITH recent_offers AS (
          SELECT 
            o.creator_user_id as user_id,
            oi.product_variant_id,
            COUNT(*) as offer_count
          FROM offers o
          JOIN offer_items oi ON o.id = oi.offer_id
          WHERE o.creator_user_id::text IN (${placeholders})
          AND o.created_at >= NOW() - INTERVAL '7 days'
          AND o.offer_status = 'OPEN'
          GROUP BY o.creator_user_id, oi.product_variant_id
        ),
        ranked_offers AS (
          SELECT 
            ro.user_id::text,
            ro.product_variant_id::text,
            p.name as product_name,
            ro.offer_count,
            ROW_NUMBER() OVER(
              PARTITION BY ro.user_id 
              ORDER BY ro.offer_count DESC, p.name
            ) as rn
          FROM recent_offers ro
          JOIN product_variants pv ON ro.product_variant_id = pv.id
          JOIN products p ON pv.product_id = p.id
        )
        SELECT 
          user_id,
          product_variant_id,
          product_name,
          offer_count
        FROM ranked_offers
        WHERE rn = 1
      `;

      const hottestOffersResults = await executeQuery(hottestOffersQuery, userIds);
      hottestOffersResults.forEach((row: any) => {
        if (userMap[row.user_id]) {
          userMap[row.user_id].hottest_shoe_offers_name = row.product_name;
          userMap[row.user_id].hottest_shoe_offers_variantid = row.product_variant_id;
          userMap[row.user_id].hottest_shoe_offers_count = parseInt(row.offer_count);
        }
      });
    }

    return Object.values(userMap);

  } catch (error) {
    console.error('Error in fetchDataPacks:', error);
    throw new Error(`Failed to fetch data packs: ${error}`);
  }
};

/**
 * Manual audience creation - fetch data packs for manually provided user IDs
 */
export const fetchManualAudienceData = async (userIds: string[], dataPacks: DataPacks): Promise<UserData[]> => {
  console.log('Manual audience creation - fetching data packs for user IDs:', userIds);
  
  // This bypasses audience filtering and only fetches data pack information
  return await fetchDataPacks(userIds, dataPacks);
}; 