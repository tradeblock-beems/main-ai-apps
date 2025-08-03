
# test_python_env.py
import sys
import os

print("--- [Python Environment Test] ---")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Python Executable: {sys.executable}")
print(f"Python Path: {sys.path}")

try:
    print("\nAttempting to import 'execute_query' from 'sql_utils'...")
    from basic_capabilities.internal_db_queries_toolbox.sql_utils import execute_query
    print("\n✅ SUCCESS: Successfully imported 'execute_query'. The Python environment is correctly configured.")

except ImportError as e:
    print(f"\n❌ FAILURE: ImportError encountered.")
    print(f"Error Details: {e}")
    print("\nThis means that the 'basic_capabilities' directory is not in Python's path.")
    print("This is the root cause of the 'Python script exited with code 1' error.")

except Exception as e:
    print(f"\n❌ FAILURE: An unexpected error occurred during import.")
    print(f"Error Details: {e}")

print("\n--- [End of Test] ---") 