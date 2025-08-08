# Batch Variant Price Updater

Transform your pricing workflow from tedious one-by-one updates to efficient batch operations! 🚀

## Quick Start

**What you need:**
1. A product ID (like `"fb878e95-84f1-429e-b615-c5046eac9e11"`)
2. Pricing data organized by size (CSV, JSON, or code)

**What it does:**
- Finds all variants for your product
- Matches your size-based pricing to the correct variant IDs
- Updates min/max prices in batch
- Verifies all changes applied correctly

## Usage Options

### Option 1: CSV File (Recommended)
Create a CSV file like `my_pricing.csv`:
```csv
size,min_price,max_price
8,120,190
8.5,125,195
9,130,200
9.5,135,205
10,140,210
```

Then run:
```python
from batch_variant_price_updater import VariantPriceUpdater

updater = VariantPriceUpdater()
updater.get_product_variants("your-product-id-here")
pricing_data = updater.load_pricing_data_from_csv("my_pricing.csv")
validated_updates = updater.validate_pricing_data(pricing_data)
results = updater.update_variant_prices(validated_updates)
updater.verify_updates("your-product-id-here", results["updated_variants"])
```

### Option 2: JSON File
Create a JSON file like `my_pricing.json`:
```json
[
    {"size": "8", "min_price": "120", "max_price": "190"},
    {"size": "8.5", "min_price": "125", "max_price": "195"},
    {"size": "9", "min_price": "130", "max_price": "200"}
]
```

Use `load_pricing_data_from_json()` instead of CSV.

### Option 3: Direct in Code
```python
pricing_data = [
    {"size": "8", "min_price": "120", "max_price": "190"},
    {"size": "8.5", "min_price": "125", "max_price": "195"},
    {"size": "9", "min_price": "130", "max_price": "200"}
]
```

### Option 4: Copy & Run Example Script
The fastest way to get started:

1. **Edit the product ID** in `update_prices_example.py`
2. **Edit the pricing data** in `example_pricing_data.csv` 
3. **Run:** `python update_prices_example.py`

## What You'll See

```
🎯 Updating prices for product: fb878e95-84f1-429e-b615-c5046eac9e11

📋 Fetching product variants...
✅ Found 12 variants with sizes for product fb878e95-84f1-429e-b615-c5046eac9e11
Available sizes: ['8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']

📊 Loading pricing data from CSV...
✅ Loaded 9 price entries from CSV

✅ Validating pricing data...
✅ Validated 9 price updates

📋 Ready to update:
  Size 8: 115-185 → 120-190
  Size 8.5: 120-190 → 125-195
  Size 9: 125-195 → 130-200
  ...

❓ Proceed with updating 9 variants? (y/N): y

🚀 Starting batch update of 9 variants...
  ✅ Size 8: $115-$185 → $120-$190
  ✅ Size 8.5: $120-$190 → $125-$195
  ✅ Size 9: $125-$195 → $130-$200
  ...

🔍 Verifying updates...
  ✅ Size 8: Confirmed $120-$190
  ✅ Size 8.5: Confirmed $125-$195
  ✅ Size 9: Confirmed $130-$200
  ...

📊 FINAL SUMMARY:
  ✅ Successfully updated: 9 variants
  ❌ Failed to update: 0 variants

🎉 Batch price update completed!
```

## Error Handling

The script handles common issues gracefully:

- **Missing sizes:** Warns you if pricing data includes sizes not available for the product
- **Invalid data:** Skips rows with missing min/max prices
- **GraphQL errors:** Reports specific mutation failures with details
- **Verification mismatches:** Catches cases where updates didn't persist correctly

## Files You'll Work With

- **`batch_variant_price_updater.py`** - The main class (don't edit)
- **`update_prices_example.py`** - Copy this and customize with your product ID
- **`example_pricing_data.csv`** - Template for your pricing data
- **`example_pricing_data.json`** - Alternative JSON template

## Pro Tips

1. **Test first:** Run with a small subset of sizes to verify everything works
2. **Back up current prices:** The script shows current prices before updating
3. **Check sizes:** The script lists available sizes for your product before loading data
4. **Use CSV:** Usually the easiest format for spreadsheet-style price management
5. **Verification matters:** Always check the verification output to ensure changes applied

## Need Help?

- Check that your product ID is correct
- Verify your CSV/JSON format matches the examples
- Make sure size values exactly match what's in the product variants
- Look for error messages in the console output - they're pretty detailed!

Ready to update some prices? Let's do this! 🔥