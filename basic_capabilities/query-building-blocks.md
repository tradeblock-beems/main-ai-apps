# Query Building Blocks Reference

This document catalogs reusable SQL query patterns and building blocks that have been developed and proven effective across our email marketing and user analysis projects. These patterns can be mixed, matched, and adapted for various use cases.

## Table of Contents

### Core User Targeting Patterns
1. **[User's Top Desired Item](#1-users-top-desired-item)** - Finds the item a user wants most based on offer frequency and engagement intensity.
2. **[User's Most Recent Offer Target](#2-users-most-recent-offer-target)** - Identifies the last item a user actively made an offer for, showing current purchase intent.
3. **[User's Newest Wishlist Addition](#3-users-newest-wishlist-addition)** - Gets the most recently added wishlist item, indicating current browsing interests.

### User Activity & Filtering Patterns
4. **[General Engaged Audience](#4-general-engaged-audience)** - Broad audience filter combining activity, closet size, and trading history with configurable thresholds.
5. **[Recently Validated Traders](#5-recently-validated-traders)** - Identifies users who completed successful trades recently, perfect for high-value targeting.
6. **[Recently Active Offer Makers](#6-recently-active-offer-makers)** - Finds users who completed offers recently, broader activity measure than validated trades.
7. **[Complete User Profile Data](#7-complete-user-profile-data)** - Fetches essential user data with size preferences for email personalization.
8. **[Dynamic User Segmentation](#8-dynamic-user-segmentation)** - Flexible user filtering with configurable criteria for account age, activity, engagement, and trading metrics.

### Product & Variant Data Patterns
9. **[Product Details with Recent Statistics](#9-product-details-with-recent-statistics)** - Gets product info with configurable lookback periods for trending/popular item campaigns.
10. **[Variant-Level Data with Size-Specific Statistics](#10-variant-level-data-with-size-specific-statistics)** - Detailed variant data with size-specific engagement metrics for personalized recommendations.

### User Analytics & Scoring Patterns
11. **[Multi-Metric User Scoring](#11-multi-metric-user-scoring)** - Calculates weighted scores from multiple user engagement metrics with normalization and tier assignment.
12. **[Comprehensive User Analytics](#12-comprehensive-user-analytics)** - Fetches complete user analytics combining recent activity with lifetime metrics for advanced segmentation.

### Advanced Patterns
13. **[Size-Based User-Product Matching](#13-size-based-user-product-matching)** - Efficient pattern for matching users to products based on size preferences in email campaigns.
14. **[Multi-Tier Fallback Strategy](#14-multi-tier-fallback-strategy)** - Finds "best available" personalization data using multiple fallback options to maximize coverage.
15. **[Data Quality Filtering](#15-data-quality-filtering)** - Ensures users have complete, usable data before including them in email campaigns.
16. **[Hunter/Active User Identification by Size](#16-hunteractiveuser-identification-by-size)** - Finds the most active users (hunters) for specific shoe sizes based on recent offer activity.
17. **[Standard Size Range Processing](#17-standard-size-range-processing)** - Efficiently processes a predefined set of standard shoe sizes for campaign targeting.
18. **[Multi-User Data Flattening](#18-multi-user-data-flattening)** - Flattens multiple user records into single CSV rows for email campaigns featuring multiple users.

### Additional Building Blocks
19. **[User's Most Traded Category/Brand](#19-users-most-traded-categorybrand)** - Identifies what types of shoes a user typically trades for brand affinity targeting.
20. **[User's Size Range Analysis](#20-users-size-range-analysis)** - Compares stated size preferences vs. actual trading behavior for sizing insights.
21. **[Product Popularity Metrics](#21-product-popularity-metrics)** - Ranks products by multiple engagement metrics with weighted popularity scoring.
22. **[Hottest Item in a User's Closet](#22-hottest-item-in-a-users-closet)** - Identifies the most in-demand item currently in a user's inventory based on global platform activity. The lookback period is now parameterized.

---

## Core User Targeting Patterns

### 1. **User's Top Desired Item** 
*Identifies the item a user wants most based on engagement intensity*

```sql
WITH ranked_desired_items AS (
    SELECT
        di.user_id,
        di.product_variant_id,
        p.name as product_name,
        ROW_NUMBER() OVER(
            PARTITION BY di.user_id 
            ORDER BY di.offers_count DESC, di.created_at DESC
        ) as rn
    FROM desired_items di
    JOIN product_variants pv ON di.product_variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE di.user_id = ANY(%(user_ids)s::uuid[]) 
    AND di.deleted_at = 0
)
SELECT
    user_id,
    product_variant_id,
    product_name
FROM ranked_desired_items
WHERE rn = 1;
```

**Key Insights:**
- Uses `offers_count` as primary ranking (strongest desire indicator)
- Falls back to `created_at DESC` for tiebreaking
- Filters out deleted items with `deleted_at = 0`

### 2. **User's Most Recent Offer Target**
*Finds the last item a user actively made an offer for*

```sql
WITH ranked_offers AS (
    SELECT
        o.creator_user_id,
        oi.product_variant_id,
        ROW_NUMBER() OVER (
            PARTITION BY o.creator_user_id 
            ORDER BY o.created_at DESC
        ) as rn
    FROM offers o
    JOIN offer_items oi ON o.id = oi.offer_id
    WHERE o.creator_user_id = ANY(%(user_ids)s::uuid[])
)
SELECT
    ro.creator_user_id as user_id,
    p.name,
    pv.id as variantid
FROM ranked_offers ro
JOIN product_variants pv ON ro.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE ro.rn = 1;
```

**Key Insights:**
- Captures actual purchase intent (user made an offer)
- Time-based ranking shows most recent interest
- Joins through `offer_items` to get the specific products

### 3. **User's Newest Wishlist Addition**
*Identifies the most recently added item to a user's wishlist*

```sql
WITH ranked_wishlist AS (
    SELECT
        wi.user_id,
        wi.product_variant_id,
        ROW_NUMBER() OVER (
            PARTITION BY wi.user_id 
            ORDER BY wi.created_at DESC
        ) as rn
    FROM wishlist_items wi
    WHERE wi.user_id = ANY(%(user_ids)s::uuid[])
    AND wi.deleted_at = 0
)
SELECT
    rw.user_id,
    p.name,
    pv.id as variantid
FROM ranked_wishlist rw
JOIN product_variants pv ON rw.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE rw.rn = 1;
```

**Key Insights:**
- Represents browsing interest and window shopping behavior
- Most recent addition indicates current taste/preferences
- Good fallback when no stronger intent signals exist

## User Activity & Filtering Patterns

### 4. **General Engaged Audience**
*Broad audience filter based on activity, closet size, and trading history*

```sql
WITH user_size_preferences AS (
    SELECT
        up.user_id,
        av.value AS shoe_size
    FROM user_preferences up
    JOIN attribute_preferences ap ON up.id = ap.user_preference_id
    JOIN attributes a ON ap.attribute_id = a.id
    JOIN attribute_values av ON ap.attribute_value_id = av.id
    WHERE a.name = 'mens_size' AND ap.preferred = TRUE
),
user_stats AS (
    SELECT
        u.id as user_id,
        u.email as user_email,
        u.first_name as user_first_name,
        usp.shoe_size,
        COALESCE(ci.closet_count, 0) as closet_items,
        COALESCE(trade_stats.lifetime_trades, 0) as lifetime_trades,
        COALESCE(EXTRACT(DAYS FROM (NOW() - u.last_active_at)), 999999) as days_since_last_active
    FROM users u
    LEFT JOIN user_size_preferences usp ON u.id = usp.user_id
    LEFT JOIN (
        SELECT user_id, COUNT(*) as closet_count
        FROM closet_items 
        WHERE deleted_at = 0 
        GROUP BY user_id
    ) ci ON u.id = ci.user_id
    LEFT JOIN (
        SELECT 
            user_id,
            COUNT(*) as lifetime_trades
        FROM (
            SELECT creator_user_id as user_id FROM offers WHERE offer_status = 'COMPLETED'
            UNION ALL
            SELECT receiver_user_id as user_id FROM offers WHERE offer_status = 'COMPLETED'
        ) all_trades
        GROUP BY user_id
    ) trade_stats ON u.id = trade_stats.user_id
)
SELECT 
    user_id,
    user_email,
    user_first_name,
    shoe_size
FROM user_stats
WHERE days_since_last_active <= %(max_days_inactive)s
AND closet_items >= %(min_closet_items)s
AND lifetime_trades >= %(min_lifetime_trades)s
AND user_email IS NOT NULL
AND user_first_name IS NOT NULL
AND shoe_size IS NOT NULL;
```

**Key Insights:**
- Combines multiple engagement signals (activity, inventory, trading)
- Configurable thresholds for different campaign types
- Ensures complete data for email personalization
- Efficient single-query approach with CTEs

### 5. **Recently Validated Traders**
*Identifies users who have completed successful trades recently*

```sql
SELECT o.creator_user_id AS user_id
FROM trades t
JOIN offers o ON t.offer_id = o.id
WHERE t.validation_passed_date IS NOT NULL 
AND t.validation_passed_date >= NOW() - INTERVAL '90 days'
UNION
SELECT o.receiver_user_id AS user_id
FROM trades t
JOIN offers o ON t.offer_id = o.id
WHERE t.validation_passed_date IS NOT NULL 
AND t.validation_passed_date >= NOW() - INTERVAL '90 days';
```

**Key Insights:**
- `validation_passed_date IS NOT NULL` is the definitive trade completion indicator
- UNION captures both sides of the trade (creator and receiver)
- Configurable time window (90 days in this example)

### 6. **Recently Active Offer Makers**
*Finds users who have completed offers recently (broader activity measure)*

```sql
SELECT creator_user_id AS user_id FROM offers
WHERE offer_status = 'COMPLETED'
AND confirmed_trade_date >= NOW() - INTERVAL '90 days'
UNION
SELECT receiver_user_id AS user_id FROM offers
WHERE offer_status = 'COMPLETED'
AND confirmed_trade_date >= NOW() - INTERVAL '90 days';
```

**Key Insights:**
- Broader activity measure than validated trades
- Includes offers that completed but may not have resulted in validated trades
- Good for identifying engaged users who are actively participating

### 7. **Complete User Profile Data**
*Fetches essential user data with size preferences*

```sql
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
    u.id as user_id,
    u.email,
    u.first_name,
    usp.shoe_size as user_size
FROM users u
LEFT JOIN user_size_preferences usp ON u.id = usp.user_id
WHERE u.id = ANY(%(user_ids)s::uuid[]);
```

**Key Insights:**
- Navigates the complex attribute preferences system
- Filters for preferred size (`ap.preferred = TRUE`)
- Uses LEFT JOIN to include users even without size preferences

### 8. **Dynamic User Segmentation**
*Flexible user filtering with configurable criteria for account age, activity, engagement, and trading metrics*

```sql
WITH user_closet_counts AS (
    SELECT user_id, COUNT(id) AS count
    FROM inventory_items
    WHERE status = 'OPEN_FOR_TRADE'
    GROUP BY user_id
),
user_wishlist_counts AS (
    SELECT user_id, COUNT(id) AS count
    FROM wishlist_items
    WHERE deleted_at = 0
    GROUP BY user_id
),
user_offers_last_90_days AS (
    SELECT creator_user_id as user_id, COUNT(id) AS count
    FROM offers
    WHERE created_at >= NOW() - INTERVAL '90 days'
    GROUP BY creator_user_id
),
user_validated_trades_last_90_days AS (
    SELECT user_id, COUNT(*) as count
    FROM (
        SELECT o.creator_user_id as user_id
        FROM trades t
        JOIN offers o ON t.offer_id = o.id
        WHERE t.validation_passed_date >= NOW() - INTERVAL '90 days'
            AND t.validation_passed_date IS NOT NULL
        UNION ALL
        SELECT o.receiver_user_id as user_id
        FROM trades t
        JOIN offers o ON t.offer_id = o.id
        WHERE t.validation_passed_date >= NOW() - INTERVAL '90 days'
            AND t.validation_passed_date IS NOT NULL
    ) all_trade_users
    GROUP BY user_id
)
SELECT
    u.id as user_id,
    u.completed_trades_count,
    COALESCE(ucc.count, 0) as closet_count,
    COALESCE(uwc.count, 0) as wishlist_count,
    COALESCE(uo90.count, 0) as offers_last_90_days,
    COALESCE(uvt90.count, 0) as validated_trades_last_90_days
FROM users u
JOIN user_activities ua ON u.id = ua.user_id
LEFT JOIN user_closet_counts ucc ON u.id = ucc.user_id
LEFT JOIN user_wishlist_counts uwc ON u.id = uwc.user_id
LEFT JOIN user_offers_last_90_days uo90 ON u.id = uo90.user_id
LEFT JOIN user_validated_trades_last_90_days uvt90 ON u.id = uvt90.user_id
WHERE u.deleted_at = 0 
AND u.email IS NOT NULL
AND ua.last_active >= NOW() - INTERVAL '180 days'  -- Automatic 180-day activity filter
-- Add dynamic filters as needed:
-- AND u.created_at <= NOW() - make_interval(days => %(min_creation_days)s)
-- AND ua.last_active >= NOW() - make_interval(days => %(max_last_active_days)s)
-- AND u.completed_trades_count >= %(min_trades_count)s
-- AND COALESCE(ucc.count, 0) >= %(min_closet_count)s
-- AND COALESCE(uwc.count, 0) >= %(min_wishlist_count)s
```

**Key Insights:**
- Pre-aggregates all key user metrics using CTEs for performance
- Combines recent activity (90 days) with lifetime metrics
- Automatic 180-day activity filter ensures only engaged users
- Flexible WHERE clause structure allows dynamic filtering
- Single query approach scales efficiently for large user bases

## Product & Variant Data Patterns

### 8. **Product Details with Recent Statistics**
*Fetches product information with configurable lookback period for stats*

```sql
WITH recent_stats AS (
    SELECT 
        p.id as product_id,
        COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '%(lookback_days)s days' THEN oi.offer_id END) as recent_offers,
        COUNT(DISTINCT CASE WHEN wi.created_at >= NOW() - INTERVAL '%(lookback_days)s days' THEN wi.user_id END) as recent_wishlist_adds,
        COUNT(DISTINCT CASE WHEN ci.created_at >= NOW() - INTERVAL '%(lookback_days)s days' THEN ci.user_id END) as recent_closet_adds
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN offer_items oi ON pv.id = oi.product_variant_id
    LEFT JOIN offers o ON oi.offer_id = o.id
    LEFT JOIN wishlist_items wi ON pv.id = wi.product_variant_id AND wi.deleted_at = 0
    LEFT JOIN closet_items ci ON pv.id = ci.product_variant_id AND ci.deleted_at = 0
    WHERE p.id = ANY(%(product_ids)s::uuid[])
    GROUP BY p.id
)
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.index_cache->>'brand' as brand,
    p.index_cache->>'colorway' as colorway,
    p.index_cache->>'retail_price' as retail_price,
    rs.recent_offers,
    rs.recent_wishlist_adds,
    rs.recent_closet_adds
FROM products p
JOIN recent_stats rs ON p.id = rs.product_id
WHERE p.id = ANY(%(product_ids)s::uuid[]);
```

**Key Insights:**
- Configurable lookback period for "recent" activity
- Aggregates multiple engagement metrics per product
- Uses `index_cache` for quick access to product attributes
- Handles deleted items appropriately

### 9. **Variant-Level Data with Size-Specific Statistics**
*Gets detailed variant information with size-specific engagement metrics*

```sql
WITH variant_stats AS (
    SELECT 
        pv.id as variant_id,
        pv.product_id,
        pv.index_cache->>'mens_size' as size,
        COUNT(DISTINCT CASE WHEN o.created_at >= NOW() - INTERVAL '%(lookback_days)s days' THEN oi.offer_id END) as recent_offers_to_get,
        COUNT(DISTINCT CASE WHEN wi.created_at >= NOW() - INTERVAL '%(lookback_days)s days' THEN wi.user_id END) as total_wishlist_adds,
        COUNT(DISTINCT ci.user_id) as total_closet_owners
    FROM product_variants pv
    LEFT JOIN offer_items oi ON pv.id = oi.product_variant_id
    LEFT JOIN offers o ON oi.offer_id = o.id
    LEFT JOIN wishlist_items wi ON pv.id = wi.product_variant_id AND wi.deleted_at = 0
    LEFT JOIN closet_items ci ON pv.id = ci.product_variant_id AND ci.deleted_at = 0
    WHERE pv.product_id = ANY(%(product_ids)s::uuid[])
    GROUP BY pv.id, pv.product_id, pv.index_cache->>'mens_size'
)
SELECT 
    variant_id,
    product_id,
    size,
    recent_offers_to_get,
    total_wishlist_adds,
    total_closet_owners
FROM variant_stats
WHERE size IS NOT NULL
ORDER BY product_id, CAST(size AS NUMERIC);
```

**Key Insights:**
- Size-specific engagement metrics for personalization
- Mixes recent activity (offers) with all-time totals (closet ownership)
- Filters out variants without size information
- Orders by size for logical presentation

## User Analytics & Scoring Patterns

### 11. **Multi-Metric User Scoring**
*Calculates weighted scores from multiple user engagement metrics with normalization and tier assignment*

```python
def calculate_and_assign_scores(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalizes data, calculates propensity scores, and assigns tiers to the user DataFrame.
    
    SCORING FORMULA:
    - 50% - Offers created in last 90 days (primary indicator of trading intent)
    - 30% - Lifetime completed trades (historical trading success)  
    - 20% - Current closet size (having inventory to trade)
    """
    if df.empty:
        return pd.DataFrame()

    # Convert all metric columns to numeric, coercing errors to NaN
    metric_columns = ['completed_trades_count', 'closet_count', 'offers_last_90_days']
    for col in metric_columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    # Drop rows where conversion failed
    df.dropna(subset=metric_columns, inplace=True)

    # Rename for clarity
    df.rename(columns={
        'completed_trades_count': 'lifetime_trades',
        'closet_count': 'closet_size'
    }, inplace=True)

    # Min-Max Normalization for each metric
    metrics_to_normalize = ['offers_last_90_days', 'lifetime_trades', 'closet_size']
    for metric in metrics_to_normalize:
        min_val = df[metric].min()
        max_val = df[metric].max()
        df[f'normalized_{metric}'] = (df[metric] - min_val) / (max_val - min_val) if (max_val - min_val) > 0 else 0

    # Weighted Score Calculation
    weights = {
        'offers_last_90_days': 0.5,  # 50% - Primary indicator of trading intent
        'lifetime_trades': 0.3,      # 30% - Historical trading success  
        'closet_size': 0.2           # 20% - Having inventory to trade
    }
    df['trade_propensity_score'] = (
        df['normalized_offers_last_90_days'] * weights['offers_last_90_days'] +
        df['normalized_lifetime_trades'] * weights['lifetime_trades'] +
        df['normalized_closet_size'] * weights['closet_size']
    ).astype(float)

    # Percentile-based Tiering
    def assign_tier(score):
        if score == 0:
            return 'NO POTENTIAL'
        elif score >= df['trade_propensity_score'].quantile(0.95):
            return 'TOP PROSPECTS'
        elif score >= df['trade_propensity_score'].quantile(0.80):
            return 'ENGAGED'
        else:
            return 'CASUAL'
    
    df['propensity_tier'] = df['trade_propensity_score'].apply(assign_tier)
    return df
```

**Key Insights:**
- Min-max normalization ensures all metrics contribute equally despite different scales
- Weighted formula prioritizes recent activity over historical metrics
- Percentile-based tiers create consistent distribution regardless of absolute scores
- Handles edge cases (zero scores, missing data) gracefully
- Configurable weights allow easy adjustment of scoring priorities

### 12. **Comprehensive User Analytics**
*Fetches complete user analytics combining recent activity with lifetime metrics for advanced segmentation*

```sql
-- This pattern is implemented in the Dynamic User Segmentation building block (#8)
-- Key additions for analytics use cases:

-- Additional metrics that can be added to the base segmentation query:
SELECT
    -- Base metrics from Dynamic User Segmentation
    u.id as user_id,
    u.completed_trades_count,
    COALESCE(ucc.count, 0) as closet_count,
    COALESCE(uwc.count, 0) as wishlist_count,
    COALESCE(uo90.count, 0) as offers_last_90_days,
    COALESCE(uvt90.count, 0) as validated_trades_last_90_days,
    
    -- Additional analytics metrics:
    EXTRACT(DAYS FROM (NOW() - u.created_at)) as account_age_days,
    EXTRACT(DAYS FROM (NOW() - ua.last_active)) as days_since_last_active,
    u.created_at as account_creation_date,
    ua.last_active as last_active_date
FROM users u
JOIN user_activities ua ON u.id = ua.user_id
-- ... rest of query from Dynamic User Segmentation pattern
```

**Key Insights:**
- Extends Dynamic User Segmentation with additional temporal analytics
- Combines recent activity windows (90 days) with lifetime totals
- Provides both absolute dates and calculated day differences
- Enables sophisticated cohort analysis and user lifecycle tracking
- Foundation for machine learning feature engineering

## Advanced Patterns

### 13. **Size-Based User-Product Matching**
*Efficiently matches users to products based on their size preferences*

```python
# Create nested lookup structure for O(1) access
variants_by_product_and_size = {}
for variant in variants_data:
    try:
        product_id = variant['product_id']
        size = float(variant['size'])
        if product_id not in variants_by_product_and_size:
            variants_by_product_and_size[product_id] = {}
        variants_by_product_and_size[product_id][size] = variant
    except (ValueError, TypeError, KeyError):
        continue

# Match users to variants by size
final_data = []
for user in audience_data:
    try:
        user_size = float(user.get('shoe_size'))
        row = {
            'email': user.get('user_email'),
            'firstname': user.get('user_first_name'),
            'usersize': user.get('shoe_size'),
        }
        
        matched_at_least_one = False
        for i, product_id in enumerate(product_ids, 1):
            variant = variants_by_product_and_size.get(product_id, {}).get(user_size)
            
            if variant:
                matched_at_least_one = True
                row[f'feat_shoe{i}_variantid'] = variant.get('variant_id')
                row[f'feat_shoe{i}_offers_in_size'] = variant.get('recent_offers_to_get')
                # ... additional variant fields
            else:
                # Handle missing variant data
                row[f'feat_shoe{i}_variantid'] = None
                # ... set other fields to None
        
        if matched_at_least_one:
            final_data.append(row)
    except (ValueError, TypeError):
        continue
```

**Key Insights:**
- Pre-builds lookup structure for efficient matching
- Handles size conversion and validation gracefully
- Only includes users who match at least one product
- Scalable pattern for multiple product features

### 14. **Multi-Tier Fallback Strategy**
*Pattern for finding the "best available" data with multiple fallback options*

```python
# Primary: Desired items (highest intent)
primary_results = get_top_target_shoe_for_users(user_ids)
target_shoes = {item['user_id']: item for item in primary_results}

# Secondary: Recent offers (medium intent)
users_needing_fallback = [uid for uid in user_ids if uid not in target_shoes]
if users_needing_fallback:
    fallback_results = get_last_offered_shoe_for_users(users_needing_fallback)
    target_shoes.update(fallback_results)

# Tertiary: Wishlist items (low intent, but something)
users_still_needing_fallback = [uid for uid in user_ids if uid not in target_shoes]
if users_still_needing_fallback:
    final_fallback = get_newest_wishlist_item_for_users(users_still_needing_fallback)
    target_shoes.update(final_fallback)
```

**Key Insights:**
- Prioritizes data sources by intent strength
- Maximizes coverage while maintaining data quality
- Only queries subsequent tiers for users who need them (efficiency)

### 15. **Data Quality Filtering**
*Ensures all users have complete, usable data for email campaigns*

```python
# Filter for complete data
qualified_users = []
for user_id in user_ids:
    user_data = all_user_data.get(user_id)
    target_shoe = target_shoes.get(user_id)
    
    # Must have basic email data
    if not user_data or not user_data.get('email') or not user_data.get('first_name') or not user_data.get('user_size'):
        continue
    
    # Must have personalization data
    if not target_shoe:
        continue
        
    qualified_users.append(user_id)
```

**Key Insights:**
- Validates both basic user data AND personalization data
- Prevents sending emails with missing/broken personalization
- Clear separation of data quality vs. business logic filtering

### 16. **Hunter/Active User Identification by Size**
*Finds the most active users (hunters) for specific shoe sizes based on recent offer activity*

```sql
WITH size_based_hunters AS (
    SELECT 
        u.id as hunter_user_id,
        u.username as hunter_username,
        f.path as hunter_avatar_path,
        u.completed_trades_count as hunter_trade_count,
        pv.index_cache->>'mens_size' as size,
        COUNT(o.id) as offers_for_product,
        p.name as target_product_name,
        (SELECT f2.path FROM files f2 WHERE f2.product_id = p.id ORDER BY f2."order" ASC NULLS LAST LIMIT 1) as target_product_image_path,
        ROW_NUMBER() OVER (
            PARTITION BY pv.index_cache->>'mens_size' 
            ORDER BY COUNT(o.id) DESC, u.completed_trades_count DESC
        ) as hunter_rank
    FROM users u
    LEFT JOIN files f ON u.avatar_id = f.id
    JOIN offers o ON u.id = o.creator_user_id
    JOIN offer_items oi ON o.id = oi.offer_id
    JOIN product_variants pv ON oi.product_variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE o.created_at >= NOW() - INTERVAL '%(lookback_days)s days'
    AND pv.index_cache->>'mens_size' = ANY(%(target_sizes)s::text[])
    AND u.deleted_at = 0
    GROUP BY u.id, u.username, f.path, u.completed_trades_count, pv.index_cache->>'mens_size', p.name, p.id
)
SELECT 
    size,
    hunter_user_id,
    hunter_username,
    hunter_avatar_path,
    hunter_trade_count,
    offers_for_product,
    target_product_name,
    target_product_image_path
FROM size_based_hunters
WHERE hunter_rank <= 3
ORDER BY size, hunter_rank;
```

**Key Insights:**
- Ranks users by recent offer activity within each size category
- Includes user profile data (username, avatar, trade history) for personalization
- Limits to top 3 hunters per size for focused targeting
- Configurable lookback period for "recent" activity definition

### 17. **Standard Size Range Processing**
*Efficiently processes a predefined set of standard shoe sizes for campaign targeting*

```python
# Standard set of men's shoe sizes for campaigns
STANDARD_SHOE_SIZES = [
    '4', '4.5', '5', '5.5', '6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', 
    '10', '10.5', '11', '11.5', '12', '12.5', '13', '14', '15', '16', '17', '18'
]

def process_by_standard_sizes(data_function, *args, **kwargs):
    """
    Generic function to process data across all standard shoe sizes.
    
    Args:
        data_function: Function that takes sizes as first parameter
        *args: Additional arguments to pass to data_function
        **kwargs: Additional keyword arguments to pass to data_function
    
    Returns:
        Dictionary mapping size to results for that size
    """
    results_by_size = {}
    
    # Process all sizes in a single query for efficiency
    all_results = data_function(STANDARD_SHOE_SIZES, *args, **kwargs)
    
    # Group results by size
    for result in all_results:
        size = result.get('size')
        if size not in results_by_size:
            results_by_size[size] = []
        results_by_size[size].append(result)
    
    return results_by_size
```

**Key Insights:**
- Standardized size range ensures consistency across campaigns
- Single query processing is more efficient than individual size queries
- Generic processing function can be reused for different data types
- Results grouped by size for easy lookup and matching

### 18. **Multi-User Data Flattening**
*Flattens multiple user records into single CSV rows for email campaigns featuring multiple users*

```python
def format_multi_user_data_for_row(users: List[Dict[str, Any]], max_users: int = 3, prefix: str = 'user') -> Dict[str, Any]:
    """
    Flattens a list of user dictionaries into a single CSV row structure.
    
    Args:
        users: List of user dictionaries with their data
        max_users: Maximum number of users to include (default 3)
        prefix: Prefix for the flattened field names (e.g., 'hunter', 'user')
    
    Returns:
        Dictionary with flattened user data suitable for CSV row
    """
    flat_data = {}
    
    # Flatten data for each user
    for i, user in enumerate(users[:max_users], 1):
        flat_data[f'{prefix}{i}_username'] = user.get('username')
        flat_data[f'{prefix}{i}_avatar'] = user.get('avatar_path')
        flat_data[f'{prefix}{i}_userid'] = user.get('user_id')
        flat_data[f'{prefix}{i}_tradecount'] = user.get('trade_count')
        flat_data[f'{prefix}{i}_offers7d'] = user.get('recent_offers')
        flat_data[f'{prefix}{i}_target1_name'] = user.get('target_product_name')
        flat_data[f'{prefix}{i}_target1_image'] = user.get('target_product_image')
    
    # Fill remaining columns with nulls if fewer users than max
    for i in range(len(users) + 1, max_users + 1):
        flat_data[f'{prefix}{i}_username'] = None
        flat_data[f'{prefix}{i}_avatar'] = None
        flat_data[f'{prefix}{i}_userid'] = None
        flat_data[f'{prefix}{i}_tradecount'] = None
        flat_data[f'{prefix}{i}_offers7d'] = None
        flat_data[f'{prefix}{i}_target1_name'] = None
        flat_data[f'{prefix}{i}_target1_image'] = None
    
    return flat_data

# Usage in CSV generation
for recipient in audience:
    recipient_size = recipient.get('shoe_size')
    hunters_for_size = hunters_by_size.get(recipient_size, [])
    
    if hunters_for_size and len(hunters_for_size) >= 3:
        # Flatten hunter data for CSV row
        hunter_data_flat = format_multi_user_data_for_row(hunters_for_size[:3], prefix='hunter')
        
        row_data = {
            'email': recipient.get('email'),
            'firstname': recipient.get('first_name'),
            'usersize': recipient_size
        }
        row_data.update(hunter_data_flat)
        final_data.append(row_data)
```

**Key Insights:**
- Configurable number of users and field prefix for flexibility
- Ensures consistent CSV structure with null values for missing users
- Reusable pattern for any multi-user email campaign format
- Handles variable numbers of users gracefully

## Additional Building Blocks to Consider

Based on the patterns we've developed, here are some other generalizable building blocks that could be valuable:

### 19. **User's Most Traded Category/Brand**
*Identify what types of shoes a user typically trades*

```sql
-- Find user's most common brand in completed trades
WITH user_trade_brands AS (
    SELECT 
        u.id as user_id,
        p.index_cache->>'brand' as brand,
        COUNT(*) as trade_count
    FROM users u
    JOIN offers o ON u.id IN (o.creator_user_id, o.receiver_user_id)
    JOIN trades t ON o.id = t.offer_id
    JOIN offer_items oi ON o.id = oi.offer_id
    JOIN product_variants pv ON oi.product_variant_id = pv.id
    JOIN products p ON pv.product_id = p.id
    WHERE t.validation_passed_date IS NOT NULL
    GROUP BY u.id, p.index_cache->>'brand'
)
SELECT user_id, brand, trade_count
FROM user_trade_brands
WHERE (user_id, trade_count) IN (
    SELECT user_id, MAX(trade_count)
    FROM user_trade_brands
    GROUP BY user_id
);
```

### 20. **User's Size Range Analysis**
*Understand what sizes a user actually trades vs. their stated preference*

```sql
-- Compare stated size preference vs. actual trading behavior
WITH actual_traded_sizes AS (
    SELECT 
        u.id as user_id,
        pv.index_cache->>'mens_size' as traded_size,
        COUNT(*) as frequency
    FROM users u
    JOIN offers o ON u.id IN (o.creator_user_id, o.receiver_user_id)
    JOIN trades t ON o.id = t.offer_id
    JOIN offer_items oi ON o.id = oi.offer_id
    JOIN product_variants pv ON oi.product_variant_id = pv.id
    WHERE t.validation_passed_date IS NOT NULL
    GROUP BY u.id, pv.index_cache->>'mens_size'
)
-- Could be extended to compare with stated preferences
```

### 21. **Product Popularity Metrics**
*Rank products by various engagement metrics*

```sql
-- Multi-metric product popularity
WITH product_metrics AS (
    SELECT 
        p.id,
        p.name,
        COUNT(DISTINCT di.user_id) as desired_by_count,
        COUNT(DISTINCT oi.offer_id) as offer_count,
        COUNT(DISTINCT wi.user_id) as wishlist_count,
        COUNT(DISTINCT CASE WHEN t.validation_passed_date IS NOT NULL THEN t.id END) as trade_count
    FROM products p
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN desired_items di ON pv.id = di.product_variant_id AND di.deleted_at = 0
    LEFT JOIN offer_items oi ON pv.id = oi.product_variant_id
    LEFT JOIN offers o ON oi.offer_id = o.id
    LEFT JOIN trades t ON o.id = t.offer_id
    LEFT JOIN wishlist_items wi ON pv.id = wi.product_variant_id AND wi.deleted_at = 0
    GROUP BY p.id, p.name
)
SELECT *, 
    (desired_by_count * 3 + offer_count * 2 + wishlist_count + trade_count * 4) as popularity_score
FROM product_metrics
ORDER BY popularity_score DESC;
```

### 22. **Hottest Item in a User's Closet**
*Identifies the most in-demand item currently in a user's inventory based on global platform activity. The lookback period is now parameterized.*

This pattern first calculates the global "hotness" of every product variant based on recent offer and trade volume, and then joins that data against a specific user's inventory to find the most coveted item they own.

**`hottestShoeOffers` Variant:**
```sql
-- The '7' can be replaced with a dynamic parameter
WITH OfferCounts AS (
  SELECT
    oi.product_variant_id,
    COUNT(o.id) AS offer_count
  FROM offers o
  JOIN offer_items oi ON o.id = oi.offer_id
  WHERE o.created_at >= NOW() - INTERVAL '7 days' AND o.offer_status = 'OPEN'
  GROUP BY oi.product_variant_id
),
UserInventory AS (
  SELECT
    inv.user_id,
    inv.product_variant_id
  FROM inventory_items inv
  WHERE inv.user_id = ANY(%s::uuid[]) AND inv.status = 'OPEN_FOR_TRADE' AND inv.deleted_at = 0
),
RankedInventory AS (
  SELECT
    ui.user_id,
    ui.product_variant_id,
    oc.offer_count,
    ROW_NUMBER() OVER(PARTITION BY ui.user_id ORDER BY oc.offer_count DESC, ui.product_variant_id) as rn
  FROM UserInventory ui
  JOIN OfferCounts oc ON ui.product_variant_id = oc.product_variant_id
)
SELECT
  ri.user_id,
  p.name as hottest_shoe_offers_name,
  pv.id::text as hottest_shoe_offers_variantid,
  ri.offer_count as hottest_shoe_offers_count
FROM RankedInventory ri
JOIN product_variants pv ON ri.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE ri.rn = 1
```

**`hottestShoeTraded` Variant:**
```sql
-- The '30' can be replaced with a dynamic parameter
WITH TradeCounts AS (
  SELECT
    oi.product_variant_id,
    COUNT(t.id) AS trade_count
  FROM trades t
  JOIN offers o ON t.offer_id = o.id
  JOIN offer_items oi ON o.id = oi.offer_id
  WHERE t.validation_passed_date >= NOW() - INTERVAL '30 days'
  GROUP BY oi.product_variant_id
),
UserInventory AS (
  SELECT
    inv.user_id,
    inv.product_variant_id
  FROM inventory_items inv
  WHERE inv.user_id = ANY(%s::uuid[]) AND inv.status = 'OPEN_FOR_TRADE' AND inv.deleted_at = 0
),
RankedInventory AS (
  SELECT
    ui.user_id,
    ui.product_variant_id,
    tc.trade_count,
    ROW_NUMBER() OVER(PARTITION BY ui.user_id ORDER BY tc.trade_count DESC, ui.product_variant_id) as rn
  FROM UserInventory ui
  JOIN TradeCounts tc ON ui.product_variant_id = tc.product_variant_id
)
SELECT
  ri.user_id,
  p.name as hottest_shoe_traded_name,
  pv.id::text as hottest_shoe_traded_variantid,
  ri.trade_count as hottest_shoe_traded_count
FROM RankedInventory ri
JOIN product_variants pv ON ri.product_variant_id = pv.id
JOIN products p ON pv.product_id = p.id
WHERE ri.rn = 1
```

**Key Insights:**
- **Two-Stage Logic**: Pre-aggregates global demand stats (`OfferCounts`, `TradeCounts`) before joining with user-specific data (`UserInventory`). This is highly performant.
- **Global vs. Local**: Correctly measures the global "hotness" of an item, not the user's personal activity for it.
- **Configurable Lookback**: Uses parameterized time windows (e.g., '7 days' for offers, '30 days' for trades) to define "recent" activity.
- **Focus on Actionable Inventory**: Filters for items that are actually available for trade (`status = 'OPEN_FOR_TRADE'`).

## Usage Guidelines

### Performance Considerations:

- Use `ANY(%(user_ids)s::uuid[])` for efficient bulk user queries
- Consider indexes on frequently filtered fields (`deleted_at`, `created_at`, `validation_passed_date`)
- ROW_NUMBER() window functions are generally more efficient than GROUP BY + MAX patterns
- LEFT JOINs preserve all users even when related data is missing
- Pre-build lookup structures for size-based matching to avoid nested loops
- Use CTEs to break complex queries into readable, optimizable chunks

### Extensibility:

Each pattern can be modified by:
- Changing time windows (90 days → 30 days, etc.)
- Adding additional filters (product categories, price ranges, etc.)
- Modifying ranking criteria (recency vs. frequency vs. engagement)
- Combining multiple patterns for complex audience definitions
- Adjusting engagement thresholds for different campaign types
- Adding new product statistics or user metrics as needed 

### 1. **User Activity & Status**
*Find users based on their recent activity or status attributes.*

**Active within the last X days:**
```sql
-- Select users active in the last 30 days
SELECT u.id, u.username, ua.last_active
FROM users u
JOIN user_activities ua ON u.id = ua.user_id
WHERE ua.last_active >= NOW() - INTERVAL '30 days';
```

**NOT active within the last X days (Dormant Users):**
```sql
-- Select users who have not been active in the last 90 days
SELECT u.id, u.username, ua.last_active
FROM users u
JOIN user_activities ua ON u.id = ua.user_id
WHERE ua.last_active < NOW() - INTERVAL '90 days';
```

**Trusted Traders:**
```sql
-- Select all users who are marked as trusted traders
```