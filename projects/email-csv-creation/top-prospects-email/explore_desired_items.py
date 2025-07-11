import os
import sys
import pprint

# Add parent directory to path to allow imports from basic_capabilities
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from basic_capabilities.internal_db_queries_toolbox.sql_utils import execute_query

def explore_schema():
    """
    Fetches a sample of data from the desired_items table to inspect its schema.
    """
    query = "SELECT * FROM desired_items LIMIT 10;"
    
    print("Executing query to fetch desired_items schema sample...")
    try:
        results = execute_query(query)
        print("Query successful. Sample data:")
        pprint.pprint(results)
    except Exception as e:
        print(f"An error occurred while executing the query: {e}")

if __name__ == '__main__':
    explore_schema() 