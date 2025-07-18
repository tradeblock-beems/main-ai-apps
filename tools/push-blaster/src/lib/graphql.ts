const GRAPHQL_ENDPOINT = process.env.GRAPHQL_ENDPOINT!;
const GRAPHQL_API_KEY = process.env.GRAPHQL_API_KEY!;

const GQL_QUERY = `
  query GetDeviceTokens($userIds: [uuid!]) {
    users(where: {id: {_in: $userIds}}) {
      id
      devices(order_by: {updated_at: desc}, limit: 1, where: {token: {_is_null: false}}) {
        token
      }
    }
  }
`;

interface GraphQLResponse {
  data?: {
    users: {
      id: string;
      devices: {
        token: string;
      }[];
    }[];
  };
  errors?: { message: string }[];
}

export async function fetchDeviceTokens(userIds: string[]): Promise<{ id: string, token: string }[]> {
  console.log('fetchDeviceTokens called with userIds:', userIds);
  console.log('GRAPHQL_ENDPOINT:', GRAPHQL_ENDPOINT ? 'Set' : 'Not set');
  console.log('GRAPHQL_API_KEY:', GRAPHQL_API_KEY ? 'Set' : 'Not set');

  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': GRAPHQL_API_KEY,
      },
      body: JSON.stringify({
        query: GQL_QUERY,
        variables: { userIds },
      }),
    });

    console.log('GraphQL response status:', response.status);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`GraphQL request failed with status ${response.status}:`, errorBody);
      throw new Error(`GraphQL request failed with status ${response.status}: ${errorBody}`);
    }

    const json: GraphQLResponse = await response.json();
    console.log('GraphQL response:', JSON.stringify(json, null, 2));

    if (json.errors) {
      console.error('GraphQL returned errors:', json.errors);
      throw new Error(json.errors.map(e => e.message).join(', '));
    }
    
    if (json.data && json.data.users) {
      const result = json.data.users.flatMap(user => 
        user.devices.length > 0 ? [{ id: user.id, token: user.devices[0].token }] : []
      );
      console.log('Returning tokens:', result);
      return result;
    }
    
    console.log('No data found, returning empty array');
    return [];
    
  } catch (error) {
    console.error('Error fetching device tokens:', error);
    throw error;
  }
} 