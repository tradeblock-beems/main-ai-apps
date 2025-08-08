"""
Batch Variant Price Updater

This script enables updating min/max market prices for multiple product variants
by providing size-based pricing data for a specific product.

Usage:
1. Provide a product ID 
2. Create pricing data (CSV or JSON) with size + min/max prices
3. Script finds all variants for the product, matches by size, and updates prices

Example CSV format:
size,min_price,max_price
8,120,190
8.5,125,195
9,130,200
9.5,135,205
10,140,210

Example JSON format:
[
    {"size": "8", "min_price": "120", "max_price": "190"},
    {"size": "8.5", "min_price": "125", "max_price": "195"},
    {"size": "9", "min_price": "130", "max_price": "200"}
]
"""

import csv
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from graphql_utils import execute_graphql_query


class VariantPriceUpdater:
    def __init__(self):
        self.product_variants = {}  # Will store size -> variant_id mapping
        
    def get_product_variants(self, product_id: str) -> Dict[str, Dict]:
        """
        Fetches all variants for a given product and creates a size-to-variant mapping.
        
        Args:
            product_id: The product ID to get variants for
            
        Returns:
            Dictionary mapping size -> variant data
        """
        query = """
        query GetProductVariants($productId: uuid!) {
            product_variants(where: {product_id: {_eq: $productId}}) {
                id
                product_id
                index_cache
                min_market_price
                max_market_price
            }
        }
        """
        
        variables = {"productId": product_id}
        result = execute_graphql_query(query, variables)
        
        if not result or "data" not in result:
            print(f"❌ Failed to fetch variants for product {product_id}")
            return {}
            
        if "errors" in result:
            print("❌ GraphQL errors:")
            for error in result["errors"]:
                print(f"  - {error.get('message')}")
            return {}
            
        variants = result["data"]["product_variants"]
        if not variants:
            print(f"❌ No variants found for product {product_id}")
            return {}
            
        # Create size-to-variant mapping
        size_variant_map = {}
        for variant in variants:
            try:
                # Extract size from index_cache
                index_cache = variant.get("index_cache", {})
                if isinstance(index_cache, str):
                    index_cache = json.loads(index_cache)
                    
                size = index_cache.get("mens_size")
                if size:
                    size_variant_map[str(size)] = {
                        "variant_id": variant["id"],
                        "current_min": variant.get("min_market_price"),
                        "current_max": variant.get("max_market_price"),
                        "size": size
                    }
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                print(f"⚠️ Warning: Could not parse variant {variant.get('id')}: {e}")
                continue
                
        print(f"✅ Found {len(size_variant_map)} variants with sizes for product {product_id}")
        self.product_variants = size_variant_map
        return size_variant_map
        
    def load_pricing_data_from_csv(self, csv_file_path: str) -> List[Dict]:
        """Load pricing data from CSV file."""
        try:
            with open(csv_file_path, 'r') as file:
                reader = csv.DictReader(file)
                data = list(reader)
                print(f"✅ Loaded {len(data)} price entries from CSV")
                return data
        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file_path}")
            return []
        except Exception as e:
            print(f"❌ Error reading CSV: {e}")
            return []
            
    def load_pricing_data_from_json(self, json_file_path: str) -> List[Dict]:
        """Load pricing data from JSON file."""
        try:
            with open(json_file_path, 'r') as file:
                data = json.load(file)
                print(f"✅ Loaded {len(data)} price entries from JSON")
                return data
        except FileNotFoundError:
            print(f"❌ JSON file not found: {json_file_path}")
            return []
        except Exception as e:
            print(f"❌ Error reading JSON: {e}")
            return []
            
    def validate_pricing_data(self, pricing_data: List[Dict]) -> List[Dict]:
        """
        Validates pricing data and matches with available variants.
        
        Returns:
            List of validated pricing entries with variant IDs
        """
        validated_updates = []
        
        for entry in pricing_data:
            size = str(entry.get("size", "")).strip()
            min_price = entry.get("min_price", "").strip()
            max_price = entry.get("max_price", "").strip()
            
            # Validate required fields
            if not size or not min_price or not max_price:
                print(f"⚠️ Skipping incomplete entry: {entry}")
                continue
                
            # Check if we have a variant for this size
            if size not in self.product_variants:
                print(f"⚠️ No variant found for size {size}, skipping")
                continue
                
            variant_info = self.product_variants[size]
            
            validated_updates.append({
                "size": size,
                "variant_id": variant_info["variant_id"],
                "min_price": min_price,
                "max_price": max_price,
                "current_min": variant_info["current_min"],
                "current_max": variant_info["current_max"]
            })
            
        print(f"✅ Validated {len(validated_updates)} price updates")
        return validated_updates
        
    def update_variant_prices(self, updates: List[Dict]) -> Dict[str, Any]:
        """
        Executes batch price updates using GraphQL mutations.
        
        Args:
            updates: List of validated update entries
            
        Returns:
            Dictionary with success/failure summary
        """
        if not updates:
            return {"success": 0, "failed": 0, "errors": []}
            
        results = {"success": 0, "failed": 0, "errors": [], "updated_variants": []}
        
        print(f"\n🚀 Starting batch update of {len(updates)} variants...")
        
        for update in updates:
            variant_id = update["variant_id"]
            size = update["size"]
            min_price = update["min_price"]
            max_price = update["max_price"]
            
            # Single variant update mutation
            mutation = """
            mutation UpdateVariantPrices($variantId: uuid!, $minPrice: numeric!, $maxPrice: numeric!) {
                update_product_variants(
                    where: {id: {_eq: $variantId}},
                    _set: {
                        min_market_price: $minPrice,
                        max_market_price: $maxPrice
                    }
                ) {
                    affected_rows
                    returning {
                        id
                        min_market_price
                        max_market_price
                    }
                }
            }
            """
            
            variables = {
                "variantId": variant_id,
                "minPrice": float(min_price),
                "maxPrice": float(max_price)
            }
            
            result = execute_graphql_query(mutation, variables)
            
            if result and "data" in result and not result.get("errors"):
                affected_rows = result["data"]["update_product_variants"]["affected_rows"]
                if affected_rows > 0:
                    results["success"] += 1
                    results["updated_variants"].append({
                        "size": size,
                        "variant_id": variant_id,
                        "old_min": update["current_min"],
                        "old_max": update["current_max"],
                        "new_min": min_price,
                        "new_max": max_price
                    })
                    print(f"  ✅ Size {size}: ${update['current_min']}-${update['current_max']} → ${min_price}-${max_price}")
                else:
                    results["failed"] += 1
                    error_msg = f"No rows affected for variant {variant_id} (size {size})"
                    results["errors"].append(error_msg)
                    print(f"  ❌ Size {size}: {error_msg}")
            else:
                results["failed"] += 1
                error_msg = f"GraphQL error for size {size}"
                if result and "errors" in result:
                    error_msg += f": {result['errors'][0].get('message', 'Unknown error')}"
                results["errors"].append(error_msg)
                print(f"  ❌ Size {size}: {error_msg}")
                
        return results
        
    def verify_updates(self, product_id: str, updated_variants: List[Dict]) -> None:
        """
        Verifies that price updates were applied correctly by re-querying the variants.
        """
        if not updated_variants:
            return
            
        print(f"\n🔍 Verifying updates for {len(updated_variants)} variants...")
        
        variant_ids = [v["variant_id"] for v in updated_variants]
        
        query = """
        query VerifyUpdates($variantIds: [uuid!]!) {
            product_variants(where: {id: {_in: $variantIds}}) {
                id
                index_cache
                min_market_price
                max_market_price
            }
        }
        """
        
        result = execute_graphql_query(query, {"variantIds": variant_ids})
        
        if not result or "data" not in result:
            print("❌ Failed to verify updates")
            return
            
        variants = result["data"]["product_variants"]
        verification_map = {v["id"]: v for v in variants}
        
        for update in updated_variants:
            variant_id = update["variant_id"]
            size = update["size"]
            expected_min = update["new_min"]
            expected_max = update["new_max"]
            
            if variant_id in verification_map:
                variant = verification_map[variant_id]
                actual_min = variant["min_market_price"]
                actual_max = variant["max_market_price"]
                
                if actual_min == expected_min and actual_max == expected_max:
                    print(f"  ✅ Size {size}: Confirmed ${actual_min}-${actual_max}")
                else:
                    print(f"  ❌ Size {size}: Expected ${expected_min}-${expected_max}, got ${actual_min}-${actual_max}")
            else:
                print(f"  ❌ Size {size}: Variant not found in verification query")


def main():
    """
    Main function to run the batch price updater.
    
    Usage examples:
    
    # Update from CSV
    updater = VariantPriceUpdater()
    
    # 1. Set your product ID
    product_id = "your-product-id-here"
    
    # 2. Get variants for the product
    updater.get_product_variants(product_id)
    
    # 3. Load pricing data
    pricing_data = updater.load_pricing_data_from_csv("pricing_data.csv")
    # OR: pricing_data = updater.load_pricing_data_from_json("pricing_data.json")
    
    # 4. Validate and execute updates
    validated_updates = updater.validate_pricing_data(pricing_data)
    results = updater.update_variant_prices(validated_updates)
    
    # 5. Verify updates
    updater.verify_updates(product_id, results["updated_variants"])
    
    print(f"\\n📊 Summary: {results['success']} successful, {results['failed']} failed")
    """
    print("🏗️ Batch Variant Price Updater")
    print("Usage: See the main() function docstring for examples")
    print("Create a CSV or JSON file with your pricing data, then call the methods as shown.")


if __name__ == "__main__":
    main()