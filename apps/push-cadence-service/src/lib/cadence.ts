import pool from './db';

interface CadenceRule {
    name: string;
    value_in_hours?: number;
    value_count?: number;
}

export const getCadenceRules = async (): Promise<Map<string, CadenceRule>> => {
    const query = 'SELECT name, value_in_hours, value_count FROM cadence_rules WHERE is_active = true';
    const result = await pool.query(query);
    const rules = new Map<string, CadenceRule>();
    result.rows.forEach(row => {
        rules.set(row.name, {
            name: row.name,
            value_in_hours: row.value_in_hours,
            value_count: row.value_count,
        });
    });
    return rules;
};

export const filterUsersByCadence = async (userIds: string[], layerId: number): Promise<{ eligibleUserIds: string[], excludedCount: number }> => {
    if (layerId === 1) {
        return { eligibleUserIds: userIds, excludedCount: 0 };
    }

    const rules = await getCadenceRules();
    const l3CooldownRule = rules.get('layer_3_cooldown_hours');
    const combinedLimitRule = rules.get('combined_l2_l3_limit_hours');

    if (!l3CooldownRule || !combinedLimitRule) {
        console.error('Cadence rules not found in database. Failing open.');
        return { eligibleUserIds: userIds, excludedCount: 0 };
    }

    const l3CooldownHours = l3CooldownRule.value_in_hours!;
    const combinedLimitHours = combinedLimitRule.value_in_hours!;
    const combinedLimitCount = combinedLimitRule.value_count!;

    const excludedUserIds = new Set<string>();

    // Rule 1: Layer 3 Cooldown
    if (layerId === 3) {
        const query = `
            SELECT DISTINCT user_id
            FROM user_notifications
            WHERE user_id = ANY($1::uuid[])
              AND layer_id = 3
              AND sent_at >= NOW() - INTERVAL '${l3CooldownHours} hours'
        `;
        const result = await pool.query(query, [userIds]);
        result.rows.forEach(row => excludedUserIds.add(row.user_id));
    }

    // Rule 2: Combined L2/L3 Limit
    const usersToCheckForCombinedLimit = userIds.filter(id => !excludedUserIds.has(id));
    if (usersToCheckForCombinedLimit.length > 0) {
        const query = `
            SELECT user_id, COUNT(*) as push_count
            FROM user_notifications
            WHERE user_id = ANY($1::uuid[])
              AND layer_id IN (2, 3)
              AND sent_at >= NOW() - INTERVAL '${combinedLimitHours} hours'
            GROUP BY user_id
            HAVING COUNT(*) >= $2
        `;
        const result = await pool.query(query, [usersToCheckForCombinedLimit, combinedLimitCount]);
        result.rows.forEach(row => excludedUserIds.add(row.user_id));
    }
    
    const eligibleUserIds = userIds.filter(id => !excludedUserIds.has(id));
    
    return {
        eligibleUserIds,
        excludedCount: excludedUserIds.size
    };
};

export const trackNotification = async (
    userId: string, 
    layerId: number, 
    pushTitle: string, 
    pushBody: string, 
    audienceDescription: string
) => {
    const query = `
        INSERT INTO user_notifications (user_id, layer_id, push_title, push_body, audience_description)
        VALUES ($1, $2, $3, $4, $5)
    `;
    await pool.query(query, [userId, layerId, pushTitle, pushBody, audienceDescription]);
};
