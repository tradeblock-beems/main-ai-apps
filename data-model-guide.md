#### Tradeblock data model and database query guide

The following is a high-level guide to our data model, focusing on the key tables and their connections to one another. Anything in ALL CAPS indicates that that entity is a table/model itself. Database fields typically use `snake_case`, while Prisma model fields often use `camelCase` (mapping to the database's `snake_case` via `@map`). GraphQL fields also generally use `snake_case`.

### Key Table: USERS

The USERS table represents a Tradeblock user.

#### Key fields:
- `id` (UUID): Unique user identifier.
- `email` (String): User's email address.
- `username` (String): User's chosen username.
- `firstName` (String): User's first name (Prisma model field: `firstName`, maps to DB `first_name`).
- `lastName` (String): User's last name (Prisma model field: `lastName`, maps to DB `last_name`).
- `last_active` (Timestamp): Found in the related `user_activity` table (`UserActivity.lastActive`), indicates the user's last active timestamp.
- `isTrustedTrader` (Boolean): Indicates trusted trader status directly on the USER model.
- `completedTradesCount` (Int): Number of completed trades.
- `closetValue` (Float/Decimal): Total value of user's inventory (Note: schema shows `Int`, guide should reflect the true type from DB/usage. GQL `users` type snippet did not include this).
- `avatarId` (UUID): Foreign key to `files.id` for the user's avatar image.
- `deletedAt` (Int): Timestamp (often an integer epoch or flag) indicating if a user is soft-deleted. Queries for active users usually filter `deletedAt = 0`. (Note: GQL `users` type snippet did not include this).
- `isVerified` (Boolean): Indicates if the user's account has been verified. (Present in GQL `users.is_verified`).
- `phoneNumber` (String): User's phone number. (Note: GQL `users` type snippet did not include this).
- `legacyUserId` (String): ID from a previous system, if applicable. (Present in GQL `users.legacy_user_id` as bpchar).
- `bio` (String): User biography. (Present in GQL `users.bio`).
- `created_at` (Timestamp): User creation timestamp. (Present in GQL `users.created_at`).
- `updated_at` (Timestamp): User last update timestamp. (Present in GQL `users.updated_at`).
- `completed_buys_count` (Int): (Present in GQL `users.completed_buys_count`).
- `completed_sells_count` (Int): (Present in GQL `users.completed_sells_count`).

#### Key relationships:
- **Inventory (Owned Products)**: The PRODUCTS that a user owns are called INVENTORYITEMS.
    - USERS connect to INVENTORYITEMS via a one-to-many relationship: `User.inventory` links to `InventoryItem`.
    - `InventoryItem.user_id` is the foreign key linking back to `User.id`.
    - Each `InventoryItem` links to a `ProductVariant` (a specific size of a product) via `InventoryItem.product_variant_id`.
- **Wishlist (Desired Products)**: The PRODUCTS that a user wants are called WISHLISTITEMS.
    - USERS connect to WISHLISTITEMS via a one-to-many relationship: `User.wishlist` links to `WishlistItem`.
    - `WishlistItem.user_id` is the foreign key linking back to `User.id`.
    - Each `WishlistItem` links to a `ProductVariant` via `WishlistItem.product_variant_id`.
- **Offers**: USERS can create and respond to OFFERS.
    - **Created Offers**: `User.createdOffers` links to `Offer` where `Offer.creator_user_id` = `User.id`.
    - **Received Offers**: `User.receivedOffers` links to `Offer` where `Offer.receiver_user_id` = `User.id`.
    - OFFERS are the core of a proposed trade, containing economic terms and linking to OFFERITEMS (the specific products in the offer).
    - OFFERCHECKOUTS handle logistics and payment for an accepted offer, linking to an OFFER via `OfferCheckout.offer_id`.
- **Trades**: When an OFFER is accepted and proceeds, it becomes a TRADE.
    - An accepted OFFER will have its `offerStatus` updated (e.g., to reflect acceptance, pending shipment, etc.). A TRADE entity is created that has a one-to-one relationship with the OFFER (`Trade.offer_id` links to `Offer.id`, often with a `@unique` constraint on `offer_id` in the `trades` table).
    - This also triggers the creation of other data objects like SHIPMENT trackers (linked via OFFERCHECKOUT).
    - USERS are connected to TRADES most efficiently by querying through their OFFERS: `User -> Offer -> Trade`. For example, `users.createdOffers.trades` or `users.receivedOffers.trades`. You can also query via `offer_checkouts` if you start from there: `offer_checkouts.offer.trades`.

#### Key statuses:
- **Account Freezing**: User administrative information, including `freeze_reason`, is stored in the `UserAdminInformation` table. If `freeze_reason` is `NULL` or an empty string, the user's account is not considered frozen. This is important for filtering active, eligible users.
- **Trusted Trader**: `User.isTrustedTrader` (Boolean) indicates this status directly on the user model. `OfferCheckout.is_trusted_trader` captures this status at the point of checkout. Additional details like `UserAdminInformation.isTrustedTraderCandidate`, `UserAdminInformation.forceTrustedTraderCandidate`, and `UserAdminInformation.trustedTraderRequirementsStartDate` provide more context on the trusted trader pipeline.
- **Bounty Program**: Status stored in `UserAdminInformation.isBountyProgramMember` (Boolean).

#### A few other useful things to understand about the USERS table:
- **Size Preferences**: User size preferences are stored through a chain: `User.userPreference` (1:1) -> `UserPreference.attributePreferences` (1:many) -> `AttributePreference` (links to `Attribute` like "mens_size" and `AttributeValue` for the actual size, and has a `preferred` boolean). `UserPreference` also links to `CommunicationPreference`.
- **Social Connections**: Users can follow (`Follows` model) and block (`Blocks` model) other users.
- **Avatar Images**: `User.avatarId` links to `files.id`. The actual image path is in `files.path`.
- **Other Related Entities**:
    - `UserBadge`: Links users to specific badges they have earned. (GQL: `users.user_badges` relationship)
    - `Reports`: Details reports made by or against a user.
    - `Device`: Stores information about user devices. (GQL: `users.devices` relationship)

#### GraphQL Considerations (USERS):
- **Naming**: The GraphQL type `users` and its fields are `snake_case` (e.g., `completed_trades_count`, `avatar_id`).
- **Key Queryable Fields**: The GQL `users` type provides key fields for querying user data, including `id`, `username`, `bio`, `is_verified`, `avatar_id`, `legacy_user_id`, `completed_buys_count`, `completed_sells_count`, `completed_trades_count`, `created_at`, and `updated_at`.
- **Rich Relationships**: GraphQL excels at traversing relationships. For the `users` type, you can easily query related data such as:
    - `addresses: [addresses!]!`
    - `avatar: files` (direct object link to the avatar file)
    - `devices: [devices!]!`
    - `followers: [follows!]!` (and `followers_aggregate` for counts/nodes)
    - `following: [follows!]!` (and `following_aggregate`)
    - `inventory: [inventory_items!]!` (and `inventory_aggregate` for user's closet items)
    - `user_activity: user_activities` (object)
    - `user_badges: [user_badges!]!`
    - `user_preference: user_preferences` (object, for settings and size preferences)
    - `wishlist: [wishlist_items!]!` (and `wishlist_aggregate` for user's wanted items)
    - For querying offers related to a user, relationships like `createdOffers` and `receivedOffers` (if available on the `users` type) would be used, or you'd query the `offers` table filtering by `creator_user_id` or `receiver_user_id`.
- **Helper Types for Powerful Querying**: Leverage Hasura-generated helper types for advanced queries:
    - `users_bool_exp`: For complex filtering in `where` clauses.
    - `users_order_by`: For sorting results.
    - `users_aggregate`: For fetching aggregate data like counts and lists of nodes.

---

### Key Table: PRODUCTS (and PRODUCTVARIANTS)

PRODUCTS represent sneaker models (e.g., Air Jordan 1 Retro High OG 'Chicago'). PRODUCTVARIANTS represent specific sizes of those product models (e.g., Air Jordan 1 Retro High OG 'Chicago', Size 10 Mens).

#### Key fields:
**PRODUCTS:**
- `id` (UUID): Unique product identifier.
- `name` (String): Name of the sneaker model (e.g., "Yeezy Boost 350 V2 'Zebra'").
- `mpn` (String): Manufacturer Part Number, if available. This is marked unique in the schema.
- `retail_price` (Float/Decimal): Original retail price. (GQL: `retail_price` type `numeric`)
- `release_date` (Timestamp): Sneaker release date. (GQL: `release_date` type `date`)
- `slug` (String): URL-friendly version of the product name.
- `pageViewsCount` (Int): Number of page views for the product. (Note: Not seen in GQL `products` snippet).
- `created_at` (Timestamp): Product creation timestamp. (Present in GQL `products.created_at`).
- `updated_at` (Timestamp): Product last update timestamp. (Present in GQL `products.updated_at`).
- `index_cache` (JSON): Denormalized attributes. (Present in GQL `products.index_cache` as `jsonb`).

**PRODUCTVARIANTS:**
- `id` (UUID): Unique product variant identifier.
- `product_id` (UUID): Foreign key linking to `PRODUCTS.id`.
- `min_market_price` (Float/Decimal): Current minimum market price for this size.
- `max_market_price` (Float/Decimal): Current maximum market price for this size. (GQL: `max_market_price` type `numeric`)
- `last_sale_price` (Float/Decimal): Price of the last recorded sale for this size. (GQL: `last_sale_price` type `numeric`)
- `upc` (String): Universal Product Code for the specific variant. (Note: Not seen in GQL `product_variants` snippet).
- `lowestAskPrice` (Decimal): Lowest current asking price for this variant. (GQL: `lowest_ask_price` type `numeric`)
- `highestBidPrice` (Decimal): Highest current bid price for this variant. (GQL: `highest_bid_price` type `numeric`)
- `index_cache` (JSON): Contains denormalized attribute data, critically including size information like `mens_size`. (Guide assumes based on original doc; its presence in GQL `product_variants` should be confirmed but is highly likely).
- `created_at` (Timestamp): Variant creation timestamp. (Present in GQL `product_variants.created_at`).
- `updated_at` (Timestamp): Variant last update timestamp. (Present in GQL `product_variants.updated_at`).
- `last_sale_at` (Timestamp): Timestamp of the last sale. (Present in GQL `product_variants.last_sale_at`).
- `highest_bid_offer_id` (UUID): Link to the offer with the highest bid. (Present in GQL `product_variants.highest_bid_offer_id`).
- `lowest_ask_offer_id` (UUID): Link to the offer with the lowest ask. (Present in GQL `product_variants.lowest_ask_offer_id`).

#### Key relationships:
- **Product Hierarchy**: `PRODUCTS` -> `PRODUCTVARIANTS` -> `INVENTORYITEMS` / `WISHLISTITEMS`.
    - A `Product` has many `ProductVariants` (`Product.productVariants` links to `ProductVariant` where `ProductVariant.product_id` = `Product.id`).
    - A `ProductVariant` can be part of many `InventoryItems` (owned by users) and `WishlistItems` (wanted by users).
- **Attributes (like Size)**:
    - **Normalized**: Stored in `attribute_selections` table, linked to `attribute_values`. Queried via nested GraphQL (e.g., `product_variants.attribute_selections.attribute_value`).
    - **Denormalized**: Stored in `ProductVariant.index_cache` (JSON field) for quick access, especially for `mens_size`. `Product.indexCache` also exists.
- **Product Images**: Product images are stored in the `FILES` table. A product can have multiple images, linked via the `Product.pictures` relation (which implies `File.productId` is the foreign key on the `File` model). `files.order` can be used to attempt to identify a primary image.
- **User-Uploaded Images (via Inventory)**: Unlike official images linked directly to a product, user-uploaded photos are linked to a specific InventoryItem. The path to find these images for a given product is a chain: products -> product_variants -> inventory_items -> files. The join condition is files.inventory_item_id = inventory_items.id. This provides a rich dataset of in-the-wild photos for each product model.


#### Key statuses:
- Not directly applicable to PRODUCTS/PRODUCTVARIANTS themselves in the same way as USERS or OFFERS. Their availability is reflected through INVENTORYITEMS.

#### A few other useful things to understand about PRODUCTS:
- **Size Data Access**: For performance-critical size filtering, using `ProductVariant.index_cache` is preferred (e.g., SQL: `pv.index_cache->>'mens_size' IN ('7', '7.5')`; GraphQL: `index_cache: { _contains: { mens_size: "10" } }`). For more complex attribute queries, the normalized `attribute_selections` path should be used.
- **MPN as Identifier**: `Product.mpn` can be a key identifier.

#### GraphQL Considerations (PRODUCTS & PRODUCTVARIANTS):
- **Naming**: Types `products`, `product_variants` and their fields are `snake_case`.
- **Queryable Fields for `products`**: Key fields available on the GQL `products` type include `id`, `name`, `mpn`, `slug`, `retail_price` (numeric), `release_date` (date), `index_cache` (jsonb for denormalized attributes), `created_at`, and `updated_at`.
- **`products` Relationships**: Easily fetch related data like `attribute_selections`, `pictures` (to `files`), associated `product_variants`, and `promo_configurations`.
- **Queryable Fields for `product_variants`**: Key fields on GQL `product_variants` include `id`, `product_id`, `min_market_price` (numeric), `max_market_price` (numeric), `last_sale_price` (numeric), `lowest_ask_price` (numeric), `highest_bid_price` (numeric), `last_sale_at`, `highest_bid_offer_id`, `lowest_ask_offer_id`, `created_at`, and `updated_at`. The `index_cache` (jsonb) is critical for querying attributes like size (e.g., `where: { index_cache: { _contains: { mens_size: "10" } } }`).
- **`product_variants` Relationships**: Traverse to `attribute_selections`, `product` (parent object), and aggregated data for `inventory_items` and `wishlist_items` (e.g., `inventory_items_aggregate`).
- **Data Types**: Note that GraphQL may use specific types like `numeric` for prices (Prisma `Decimal`) and `date` for dates.
- **Helper Types**: Utilize standard Hasura helper types (e.g., `products_bool_exp`, `product_variants_order_by`) for filtering, sorting, and aggregation.

---

### Key Table: OFFERS

The OFFER is the foundation of the trading system, representing a proposed trade's economic terms.

#### Key fields:
- `id` (UUID): Unique offer identifier.
- `creator_user_id` (UUID): Foreign key to `USERS.id` for the offer creator.
- `receiver_user_id` (UUID): Foreign key to `USERS.id` for the offer receiver.
- `offerStatus` (Enum/String): Tracks the current status of the offer (e.g., `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED`).
- `cash` (Float/Decimal): Monetary component of the trade.
- `creatorItemsValue` (Float/Decimal): Value of items offered by the creator. (Note: Not seen directly on GQL `offers` type snippet).
- `receiverItemsValue` (Float/Decimal): Value of items offered by the receiver. (Note: Not seen directly on GQL `offers` type snippet).
- `offerType` (Enum/String): Type of offer. In GQL, this is `offer_type` and uses `offer_types_enum`.
- `originalOfferId` (UUID): Links to a previous offer if this is part of a negotiation chain. (GQL: `original_offer_id`).
- `confirmed_trade_date` (Timestamp): *Generally, for identifying truly validated and completed trades, `Trade.validation_passed_date` is preferred. This field on Offer might signify an earlier stage of confirmation.* (Present in GQL `offers.confirmed_trade_date`).
- `expirationDate` (Timestamp): When the offer is set to expire. (Present in GQL `offers.expiration_date`).
- `key` (String): A potential unique key for the offer. (Present in GQL `offers.key`).
- `tradeValuePercentage` (Decimal): Calculated trade value percentage difference. (GQL: `trade_value_percentage` type `numeric`).
- `tradeValueDifference` (Decimal): Calculated trade value difference in currency. (GQL: `trade_value_difference` type `numeric`).
- `created_at` (Timestamp): Offer creation timestamp. (Present in GQL `offers.created_at`).
- `updated_at` (Timestamp): Offer last update timestamp. (Present in GQL `offers.updated_at`).
- `offer_currency` (String): Currency of the offer. (GQL: `offer_currency` uses `currencies_enum`).
- `offer_status` (String): Status of the offer. (GQL: `offer_status` uses `offer_statuses_enum`).
- `offer_transaction_type` (String): Transaction type. (GQL: `offer_transaction_type` uses `offer_transaction_types_enum`).

#### Key relationships:
- **Users**: Directly links to `creator_user_id` and `receiver_user_id`.
- **Offer Items**: `Offer.offerItems` links to `OFFERITEMS`. Each `OfferItem` specifies a `ProductVariant` involved in the offer and can be linked to a specific `InventoryItem`.
- **Trade**: An accepted OFFER leads to a TRADE. `Offer` has a one-to-one relationship with `Trade` (`Trade.offer_id` = `Offer.id`).
- **Offer Checkout**: `OfferCheckout` links to `Offer` via `OfferCheckout.offer_id`. It handles payment, shipping, and point-in-time trusted trader status for the trade.
- **OfferTransactions**: When a trade is confirmed, an `OfferTransaction` is created (on the graphQL level), which includes `creatorTerms` and `receiverTerms`. Each of these contains an array of `OfferTransactionTermOfferItem` objects, which record the condition, productId, size, and sku of each item as it was traded. This is the authoritative source for item condition at the time of trade.
- **Negotiation Chain**: `Offer.originalOfferId` can link to `Offer.id` to trace counter-offers.

#### Key statuses:
- The `offerStatus` field is critical for tracking the lifecycle of an offer. Specific enum values should be referenced from the schema (e.g., `PENDING`, `ACCEPTED`, `COUNTERED`, `DECLINED`, `EXPIRED`, `CANCELED`).

#### A few other useful things to understand about OFFERS:
- **Financial Calculations**: The `OfferTotal` GraphQL type provides calculated fields for service fees, shipping, tax, insurance, and totals.
- **Point-in-Time Pricing**: `OfferItem.pricingOnTradeConfirmation` (JSON) stores item pricing at the time of trade confirmation.
- **Fee-Free Flags**: `OfferItem` has `sellerFeeFree` and `buyerFeeFree` booleans. (Note: These were not seen in GQL `offer_items` snippet).
- **Offer Item Ownership Logic**:
    - Each `offer_item` has an `offer_item_owner` field, which is an enum with values CREATOR or RECEIVER. This field indicates which party originally owned the item at the time of the offer.
    - To determine which items a user received in a trade, you must:
        - Identify the user's role in the offer (`creator_user_id` or `receiver_user_id`).
        - Select `offer_items` where `offer_item_owner` is the opposite of the user's role (i.e., if the user was the creator, select items with `offer_item_owner` = RECEIVER; if the user was the receiver, select items with `offer_item_owner` = CREATOR). This ensures you are counting only the items the user acquired in the trade, not the ones they gave away.
- **Inventory items are immutable after a trade**: 
    - When a trade is completed, the original inventory item (owned by the sender) gets its status set to HAS_NEW_OWNER and is never modified again.
    - A new inventory item is created for the recipient. This new item is a “clone” and starts its own lifecycle in the recipient’s closet.



#### GraphQL Considerations (OFFERS & OFFERITEMS):
- **Naming**: Types `offers`, `offer_items` and their fields are `snake_case`.
- **Queryable Fields for `offers`**: The GQL `offers` type includes fields such as `id`, `creator_user_id`, `receiver_user_id`, `cash` (numeric), `confirmed_trade_date`, `expiration_date`, `key`, `original_offer_id`, `trade_value_difference` (numeric), `trade_value_percentage` (numeric), `created_at`, `updated_at`. Status and type fields often use specific enums:
    - `offer_currency` (uses `currencies_enum`)
    - `offer_status` (uses `offer_statuses_enum`)
    - `offer_transaction_type` (uses `offer_transaction_types_enum`)
    - `offer_type` (uses `offer_types_enum`)
- **`offers` Relationships**: Query related `creator` and `receiver` (user objects), `offer_checkouts`, associated `offer_items`, and linked `trades`.
- **Queryable Fields for `offer_items`**: The GQL `offer_items` type includes `id`, `offer_id`, `inventory_item_id`, `product_variant_id`, `offer_item_owner` (uses `offer_item_owners_enum`), `offer_item_validation_status` (String), `created_at`, `deleted_at`, `updated_at`.
- **`offer_items` Relationships**: Link to the parent `offer`, the specific `inventory_item` and `product_variant`, and also to `offer_items_issues` for tracking any issues associated with an item in an offer.
- **Helper Types**: Standard Hasura helpers (`offers_bool_exp`, `offer_items_order_by`, etc.) are available for advanced querying.

---

### Key Table: TRADES

A TRADE represents the execution of an accepted OFFER.

#### Key fields:
- `id` (UUID): Unique trade identifier.
- `offer_id` (UUID): Foreign key linking to `OFFERS.id` (one-to-one relationship, unique). (CRITICAL: This direct FK was NOT SEEN on GQL `trades` type. The link is likely via `offers.trades`. This needs emphasis).
- `state` (Enum/String): Tracks the progression of the trade. In GQL, this is `state` (String). Its enum source needs clarification (e.g., `trade_statuses_enum`).
- `validation_passed_date` (Timestamp): Timestamp indicating when the trade's items/conditions were validated. This is key for identifying successfully processed trades. (Present in GQL `trades.validation_passed_date`).
- `confirmed_trade_date` (Timestamp): *This field exists on both `Offer` and `Trade`. For definitive validation of a completed trade, `Trade.validation_passed_date` is the most reliable. `Trade.confirmed_trade_date` or `Offer.confirmed_trade_date` might indicate user confirmation steps or earlier parts of the process but `validation_passed_date` signifies the trade passed all necessary checks.* (Present in GQL `trades.confirmed_trade_date`).
- `origin` (String): Source or origin of the trade. (Note: Not seen in GQL `trades` snippet).
- `onHoldExpirationDate` (Timestamp): If the trade is on hold, when that hold expires. (Note: Not seen in GQL `trades` snippet).
- `tradeFlowVersion` (Int): Version of the trade flow logic used. (Note: Not seen in GQL `trades` snippet).

#### Key relationships:
- **Offer**: One-to-one with `Offer` via `Trade.offer_id`. This is the primary link.
- **Offer Checkout**: Indirectly linked via `Offer`. `OfferCheckout` (connected to the `Offer`) handles logistics like shipping and payment.
- **Shipments**: `OfferCheckout` connects to `SHIPMENT` entities which track the physical movement of items.
- **Trade State Updates**: The `TradeStateUpdate` model provides a historical log of changes to the `Trade.state`.

#### Key statuses:
- The `Trade.state` field tracks the lifecycle (e.g., `AWAITING_SHIPMENT`, `SELLER_SHIPPED`, `AUTHENTICATION_PASSED`, `BUYER_SHIPPED`, `COMPLETED`).
- `validation_passed_date`: Its presence indicates a validated trade. Querying for `validation_passed_date: { _is_null: false }` or `_gt: some_date` is common.

#### A few other useful things to understand about TRADES:
- **Querying User Trades**: To find trades for a user, typically query through their `OFFERS`: `User.createdOffers.trades` or `User.receivedOffers.trades`. Filter these trades by `validation_passed_date` for successfully validated trades.
- **Immutability**: `validation_passed_date` serves as both a timestamp and a validation flag and is immutable once set.
- **Historical Tracking**: Use `TradeStateUpdate` for a detailed history of state changes. (GQL: `trades.trade_state_updates` relationship).

#### GraphQL Considerations (TRADES):
- **Naming**: Type `trades` and its fields are `snake_case`.
- **Queryable Fields**: The GQL `trades` type provides key fields like `id`, `confirmed_trade_date`, `validation_passed_date`, and `state` (String - refer to `trade_statuses_enum` or similar for values).
- **Linking to Offers**: While the `trades` GraphQL type itself might not list a direct `offer_id` field, the relationship to its corresponding `Offer` is typically established by querying from the `offers` type (e.g., `offers { trades { ... } }`) which has a direct relationship to `trades`. Alternatively, if you have an `offer_id`, you can query `offers(where: {id: {_eq: $offer_id}}) { trades { ... } }`.
- **State History**: The `trade_state_updates: [trade_state_updates!]!` relationship allows querying the history of state changes for a trade.
- **Helper Types**: Expect standard Hasura helper types (`trades_bool_exp`, `trades_order_by`, `trades_aggregate`) for powerful filtering, sorting, and aggregation.

---

### Key Table: DESIREDITEMS

A DESIREDITEM represents a user's interest in a specific ProductVariant. This is essentially the user's "wishlist".

#### Key fields:
- `id` (UUID): Unique desired item identifier.
- `created_at` (Timestamp): Timestamp of when the item was added.
- `updated_at` (Timestamp): Timestamp of the last update.
- `deleted_at` (Integer): Flag indicating deletion (0 for active).
- `offers_count` (Integer): The number of offers the user has created for this specific item. This is the strongest indicator of user desire.
- `product_variant_id` (UUID): Foreign key linking to `PRODUCTVARIANTS.id`.
- `user_id` (UUID): Foreign key linking to `USERS.id`.

#### Key relationships:
- **Users**: Directly links to `user_id`.
- **Product Variants**: Directly links to `product_variant_id`.

#### A few other useful things to understand about DESIREDITEMS:
- **Measuring Desire**: The `offers_count` field is the primary metric for determining how much a user wants a particular item. When identifying a user's "top target," query for the `desired_item` with the highest `offers_count`. Use `created_at DESC` as a tie-breaker.

---

### SQL vs. GraphQL Querying

Understanding when and how to use direct SQL queries versus the Hasura GraphQL layer is crucial.

#### Naming Conventions:
- **SQL/Database**: Fields use `snake_case` (e.g., `is_trusted_trader`, `validation_passed_date`). Prisma models use `camelCase` for field names and map to `snake_case` database columns using `@map` (e.g., `isTrustedTrader @map("is_trusted_trader")`). SQL queries written against Prisma client often use `camelCase`. Direct SQL uses `snake_case`.
- **GraphQL**: Schema (type names, fields) uses `snake_case` (e.g., `is_trusted_trader`, `product_variants`). (Correction: For Hasura-exposed tables and their fields, this is predominantly true. Other GraphQL schema parts like mutation inputs or custom resolver outputs might use camelCase).

#### When to Use Which:

- **GraphQL (Hasura Layer)**:
    - **Primary choice for most application reads**: Provides a flexible, typed API.
    - **Relationship Traversal**: Excellent for fetching nested data across related tables easily (e.g., `users { inventory { product_variant { product { name } } } }`). GraphQL relationships are explicitly defined in the schema.
    - **Filtering, Sorting, Pagination, Aggregation (Hasura)**: Hasura automatically generates powerful constructs for these. For a table like `<table>`, expect:
        - `<table>_bool_exp`: Input type for complex filtering in `where` clauses (e.g., `users(where: {created_at: {_gte: "..."}})`).
        - `<table>_order_by`: Input type for sorting (e.g., `users(order_by: {created_at: asc})`).
        - `<table>_aggregate`: Allows fetching aggregate data like counts (e.g., `users_aggregate { aggregate { count } nodes { id } }`).
        - `<table>_select_column`: Enum listing table columns, used with `distinct_on` or in aggregate counts.
    - **Real-time Subscriptions**: For live data updates.
    - **JSON Field Querying**: Supports operators like `_contains` for JSON fields (e.g., `product_variants(where: { index_cache: { _contains: { mens_size: "10" } } })`).
    - **Authorization**: Leverages Hasura's permission system.

- **SQL (Direct or via Prisma)**:
    - **Complex Writes/Transactions**: For operations not easily expressed or optimized in GraphQL mutations, or requiring complex transactional logic.
    - **Performance-Critical Queries with Specific Optimizations**: When you need fine-grained control over execution plans, specific index usage, or complex joins/subqueries that are hard to achieve or perform poorly via GraphQL.
        - Example: Filtering `product_variants` by size using `index_cache`: `SELECT ... FROM product_variants pv WHERE pv.index_cache->>'mens_size' = '10'`.
    - **Advanced Window Functions/CTEs**: For complex analytical queries, rankings, or calculations not directly supported by GraphQL aggregations.
    - **Bulk Operations**: Sometimes more efficient for large bulk inserts, updates, or deletes.
    - **Database-Specific Features**: When needing to use functions or features unique to PostgreSQL that aren't exposed via GraphQL.

- **Complex Correlated Subqueries (LATERAL JOIN)**: 
    - For "top-N-per-group" problems (e.g., "get the 5 most recent comments for every post"), a LATERAL JOIN is an extremely powerful and efficient PostgreSQL feature. It acts like a forEach loop, allowing a subquery to be executed for each row of an outer query, referencing columns from that outer row. 
    - This is the ideal technique for grabbing a limited set of related items per row, such as fetching a specific number of user-uploaded images for each InventoryItem.

#### Key Performance Tips:
- **Use `index_cache` for Sizes**: For `product_variants`, filtering by size using the `index_cache` JSON field is generally more performant than joining through `attribute_selections` for simple size lookups. Remember the string formatting for sizes ("7" vs "7.5").
- **Filter Early**: Apply `where` clauses at the highest appropriate level in GraphQL to reduce data fetched.
- **Fetch Only What You Need**: Select only the necessary fields in your queries.
- **Date Filtering**: Use ISO format for `timestamptz` fields in GraphQL. For validated trades, filter on `trades.validation_passed_date`.

- **Pre-Aggregate with CTEs for Complex Stats**: When building queries that calculate multiple statistics across different tables (e.g., counting offers, closet adds, and trades for a product), avoid joining all the raw tables together in a single, large query. This can cause the database to run out of temporary disk space and perform poorly. Instead, use a multi-CTE (Common Table Expression) approach:
    - **Step 1:** Create a separate CTE for *each statistic*.
    - **Step 2:** In each CTE, perform the necessary joins, filtering (e.g., by date), and aggregation (`COUNT`, `SUM`, etc.) for that single statistic. This creates a very small, intermediate result set.
    - **Step 3:** In the final `SELECT` statement, join your small, pre-aggregated CTEs to a base table (e.g., `products`). This is vastly more efficient than joining large, raw tables.

---

### Working with Files and Images

Asset management, especially for user avatars and product images, relies on the `FILES` table.

#### Key `FILES` Table Information:
- **Core Columns (for SQL)**: `id`, `path`, `filename`, `type` (often NULL for images), `product_id` (links to `products.id`), `owner_id` (can link to `users.id` for user-uploaded files, or `users.avatarId` links to `files.id`), `inventoryItemId`, `offerItemIssueId`, `shipmentId` (links to `Shipment`), `order`, `deleted_at`.
- **GraphQL `files` type capabilities**: The GraphQL `files` type enables querying for fields like `id`, `filename`, `path`, `owner_id`, `product_id`, `inventory_item_id`, `order`, and `updated_at`. This allows fetching file metadata and linking files to their respective owners or entities.

#### URL Construction for App Linking & Assets:
- **Universal Links**: For user-facing URLs (profiles, products) that should open in the mobile app if installed, omit "www." (e.g., `tradeblock.us/collector/{USER_ID}/closet`).
- **Default Images & Email Rendering**:
    - Provide fallback URLs for missing images (e.g., `https://via.placeholder.com/150/CCCCCC/808080?Text=No+Avatar`).
    - Images under system paths (e.g., `/SYS_IMAGE/`) might be served with `Content-Disposition: attachment`, preventing email rendering. Ensure server sends `Content-Disposition: inline` or no such header for these.

---

### Key Enumerations

Several fields rely on specific enumerated values. Always refer to the definitive schema for the most up-to-date list. These often correspond to dedicated tables in the schema (e.g., `InventoryStatus` table for `InventoryItem.status`) or specific GraphQL Enum types.

- **`InventoryItem.status`**: Defined by GraphQL enum `inventory_status_enum`. Values from Prisma guide include:
    - `OPEN_FOR_TRADE`
    - `LOCKED_IN_TRADE`
    - `HAS_NEW_OWNER`
    - `REMOVED`
- **`Offer.offerStatus`**: This is a critical field. The values are defined in the `offer_statuses` table. Direct database introspection has confirmed the following valid statuses. Use these exact string values in your `WHERE` clauses to ensure correctness. The most common status for an active, open offer is `'OPEN'`.
    - `OPEN`
    - `COMPLETED`
    - `FAILED`
    - `DECLINED`
    - `IN_PROGRESS`
    - `ON_HOLD`
    - `DRAFT`
    - `RESCINDED`
    - `EXPIRED`
    - `COUNTERED`
    - `PAUSED`
- **`Offer.offerType`**: Defined by GraphQL enum `offer_types_enum`. Values from Prisma guide/schema likely include `BUY`, `SELL`, `TRADE`. (Note: GQL also has `OfferTypeInput` (PRIVATE, PUBLIC) for offer creation/filtering - clarify distinction if needed).
- **`Offer.offerTransactionType`**: Defined by GraphQL enum `offer_transaction_types_enum`. Values from Prisma/GQL likely include `EXCHANGE`, `BUY`, `SELL`.
- **`Offer.offerCurrency`**: Defined by GraphQL enum `currencies_enum`.
- **`Offer.offerPauseReason`**: Defined by `OfferPauseReason.reason` (confirm GQL enum name if different).
- **`OfferItem.offerItemOwner`**: Defined by GraphQL enum `offer_item_owners_enum`. Values: `CREATOR`, `RECEIVER`.
- **`OfferItem.offerItemValidationStatus`**: GQL `offer_items.offer_item_validation_status` is `String`. Values/source need to be clarified (e.g., "Refer to `OfferItemValidationStatus` table/enum values").
- **`Trade.state`**: GQL `trades.state` is `String!`. Values (e.g., `PENDING_SHIPMENT`, `COMPLETED`) need to be mapped from its corresponding enum (e.g., `trade_statuses_enum`, confirm actual name).
- **`Shipment.shipmentStatus`**: Defined by `ShipmentStatus.status` (confirm GQL enum name, e.g., `shipment_statuses_enum`).
- **`Shipment.shipmentDestination`**: Defined by `ShipmentDestination.destination` (confirm GQL enum name).
- **Other Enums**: `badges_enum` (for `user_badges.badge_name`).

---

### Miscellaneous Important Info

This section covers other valuable details from the original guide.

- **Inventory Management**:
    - **Immutable History**: `InventoryItem.previousInventoryItemId` creates a linked list for an immutable audit trail of ownership changes.
    - `tradeWillingness`: Indicates user's willingness to trade an item.
    - `wasPreviouslyAuthenticated`: Flag for trusted items.
    - `note` (String): User-added note on the inventory item.
    - `indexCache` (JSON): Denormalized data for the inventory item, queryable in GQL (e.g., `inventory_items.index_cache` as `jsonb`).
    - **indexCache Contents & Usage**:
        - The `index_cache` JSON field on inventory_items stores denormalized, point-in-time attribute data for each item. This includes key attributes such as:
            - `inventory_condition`: The immutable condition of the item at the moment it was traded (e.g., "New", "New with defects", "Used").
            - `box_status`: The box/accessory status at the time of trade (e.g., "Original box - good condition").
            - `has_accessories`: Whether the item included accessories at the time of trade.
            - `inventory_trade_willingness`: The owner's trade willingness at the time of trade.
        - These values are captured as a snapshot and do not change after the trade, even if the recipient later updates their own copy.
        - Best Practice: For any inventory item received via a trade (i.e., has a non-null previousInventoryItemId), always reference the index_cache of the previous inventory item to determine the true, immutable state of these attributes at the time of the trade.
    - **GraphQL Link to Offers**: The `inventory_items` GQL type has a direct array relationship to `offer_items`, facilitating queries for offers related to specific inventory.

- **Shipping and Logistics (`Shipment` Model)**:
    - Tracks shipment status (via `Shipment.shipmentStatus`), location, `trackingLink`, `shippingLabelLink`, `trackingNumber`.
    - Links to `OfferCheckout`.
    - Has validator assignments for authentication steps, linking to the `Validator` model via fields like `checkedInDateValidatorId`.
    - Records key timestamps: `sentDate`, `estimatedDeliveryDate`, `deliveredDate`, `checkedInDate`, `pickedUpDate`, `boxedUpDate`, `validatorReviewSubmitDate`.
    - Destination defined by `Shipment.shipmentDestination` (GQL enum `shipment_destinations_enum` or similar).
    - **GraphQL `offer_checkouts.shipments`**: The `offer_checkouts` GQL type has a direct array relationship to `shipments`, allowing easy traversal from a checkout to its associated shipments.

- **Payment and Pricing**:
    - `OfferCheckout`: Contains payment method, shipping address, insurance, fee options, point-in-time `is_trusted_trader`.
    - `PaymentTransaction`: Links to `OfferCheckout`, contains external payment system `invoiceId`.
    - It also links to `CommunicationPreference` which details user choices for receiving emails/push notifications for different `CommunicationPreferenceGroup` types. The `users` GQL type provides access via the `user_preference` relationship, which in turn links to `user_preferences` data.

- **Data Completeness for Personalization**: For campaigns, filter audiences to users with all necessary data points (e.g., `email`, `firstName`, relevant `size` preferences) to avoid messages with missing data. (Note: availability of `email`, `firstName` in GQL `users` type was unclear from snippets).

- **GraphQL Utilities Toolbox (`graphql_utils.py`)**:
    - Contains `GraphQLClient` for executing and testing GraphQL queries with variables.

- **Social Graph Queries**: Use `Follows` and `Blocks` models. Filter results based on block status.

- **Historical Tracking (General)**:
    - Follow immutable chains (inventory history, `TradeStateUpdate` for trade state changes).
    - Use timestamp fields for state changes.

- **User Preferences (`UserPreference` model)**:
    - Beyond size preferences, this model holds other settings like `useDarkMode`, `useVacationMode`, `blockPrivateBids`.
    - It also links to `CommunicationPreference` which details user choices for receiving emails/push notifications for different `CommunicationPreferenceGroup` types. (GQL `users.user_preference` links to `user_preferences` type).

- **Testing and Validation**:
    - Regularly test queries.
    - Validate results with business stakeholders.
    - Create test cases.
    - Use query variables in GraphQL.

- **Offer Items Issues (`offer_items_issues` GQL type)**:
    - This related type for issues on offer items, linking to `files` and `offer_item_issue_offer_item_issue_types`. 


# Best Practice: Using the `get-type-fields` MCP Tool for Schema Exploration, but ONLY WHEN THE DOCUMENTATION ABOVE IS INSUFFICIENT FOR THE TASK AT HAND.

## Why Use It?
The `get-type-fields` MCP tool is a powerful utility for exploring the GraphQL schema and understanding the structure of your data models. It allows you to:
- Quickly list all fields available on any GraphQL type (e.g., `users`, `offers`, `inventory_items`).
- Discover relationships, aggregates, and nested objects without guessing or relying on outdated documentation.
- Validate the exact field names and types before writing or debugging queries.
- Avoid common errors like referencing non-existent fields or using the wrong relationship direction.

## When to Use It
- **Before writing any new query**: Run `get-type-fields` on the root type(s) you plan to query to see all available fields and relationships.
- **When debugging a query error**: If you get a "field not found" or similar error, use `get-type-fields` to check the actual schema.
- **When optimizing or refactoring**: Use it to find aggregate fields, helper relationships, or more efficient query paths.
- **When onboarding or exploring unfamiliar models**: It's the fastest way to build a mental model of the data structure.

## Example Workflow
1. Unsure how to get a user's trade count? Run `get-type-fields` on `users` and look for fields like `completed_trades_count` or relationships to `offers`/`trades`.
2. Need to join inventory to product variants? Use `get-type-fields` on `inventory_items` to see the available relationships and foreign keys.
3. Want to aggregate wishlist counts? Use `get-type-fields` on `product_variants` and `wishlist_items` to find the best join path.


---

**Pro Tip:**
Whenever you’re stuck or want to double-check your assumptions, run `get-type-fields` on the relevant type. It’s like having x-ray vision for your schema—don’t fly blind!

# Best Practice: Direct Schema Exploration via SQL

When GraphQL documentation (`get-type-fields`) is insufficient, or when dealing with tables not yet fully integrated into the GQL schema, direct SQL exploration is the most reliable method for understanding data structure.

## The `SELECT * LIMIT 10` Technique
Before attempting to write a complex query against an unfamiliar table, the first step should always be to run a simple discovery query.

**Why Use It?**
-   **Ground Truth:** It provides the absolute ground truth of the table's columns, data types, and typical values.
-   **Avoids Guesswork:** Eliminates errors from guessing column names or relationships based on outdated or incomplete documentation.
-   **Reveals Hidden Logic:** Can uncover important fields not exposed in the GraphQL layer, like counts or status flags, which are critical for correct query logic.

## Workflow
1.  **Identify Uncertainty:** Recognize that the schema documentation for a target table (e.g., `desired_items`) is missing or unclear.
2.  **Create a Temporary Script:** Write a small, temporary Python script that uses the `sql_utils.execute_query` helper.
3.  **Run the Discovery Query:** The script should execute a `SELECT * FROM your_table_name LIMIT 10;` query.
4.  **Analyze the Output:** Pretty-print and carefully inspect the results to identify all column names, data formats (especially for timestamps and UUIDs), and potential metrics (like `offers_count`).
5.  **Proceed with an Informed Query:** Use the insights gained from the sample data to write the correct, targeted SQL query for the actual task.
6.  **Delete the Script:** Once the discovery is complete, delete the temporary script.
