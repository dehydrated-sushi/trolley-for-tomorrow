# Data ERD

This ERD shows the current PostgreSQL app schema plus the processed
`food_reference.csv` artifact from the data pipeline.

```mermaid
erDiagram
    USERS {
        int user_id PK
        varchar name
        varchar email UK
        text password_hash
        int age
        numeric height
        numeric weight
        numeric weekly_budget
        int household_size
        int dietary_flags
        timestamp created_at
        timestamp updated_at
    }

    RECIPES {
        int id PK
        text name
        int minutes
        int n_ingredients
        text ingredients_clean
        text steps_clean
        float calories
        float total_fat
        float sugar
        float sodium
        float protein
        float saturated_fat
        float carbohydrates
    }

    KNOWN_INGREDIENTS {
        int id PK
        text ingredient_name UK
        text category
    }

    RECEIPTS {
        int id PK
        int user_id
        text original_filename
        text stored_file_path
        text scan_source
        text store_name
        date purchase_date
        text scan_status
        text raw_ocr_text
        text parser_version
        int item_count
        float total_amount
        timestamp created_at
        timestamp updated_at
    }

    RECEIPT_ITEMS {
        int id PK
        int receipt_id FK
        text receipt_filename
        text receipt_path
        text name
        text matched_name
        float match_score
        text qty
        float price
        date expiry_date
        timestamp created_at
    }

    FRIDGE_ITEMS {
        int id PK
        text name
        text category
        float quantity
        text unit
        float price
        date expiry_date
        text source
        timestamp created_at
    }

    SHOPPING_LIST {
        int id PK
        text name
        text category
        float quantity
        text unit
        float estimated_price
        boolean checked
        timestamp created_at
    }

    MEAL_LOGS {
        int id PK
        int recipe_id
        text recipe_name
        float eaten_quantity
        float calories
        float protein
        float carbs
        float fat
        timestamp created_at
    }

    USER_BUDGET {
        int id PK
        float weekly_budget
        timestamp updated_at
    }

    USER_PREFERENCES {
        int id PK
        boolean vegetarian
        boolean vegan
        boolean pescatarian
        boolean gluten_free
        boolean dairy_free
        boolean nut_free
        timestamp updated_at
    }

    USER_FAVOURITES {
        int id PK
        int user_id
        int recipe_id
        text recipe_name
        timestamp created_at
    }

    RECIPE_IMAGES {
        int recipe_id PK
        text image_filename
        bigint pixabay_id
        text pixabay_user
        bigint pixabay_user_id
        text pixabay_page_url
        timestamp fetched_at
    }

    FOOD_REFERENCE_CSV {
        text ingredient_name
        text canonical_name
        text afcd_food_key
        text afcd_food_name
        float afcd_match_score
        text nutrition_basis
        float energy_kj
        float energy_kcal
        float protein_g
        float fat_total_g
        float carbohydrates_g
        float sugars_g
        float fibre_g
        float sodium_mg
        text cpi_category
        date latest_cpi_period
        float latest_cpi_index
        float cpi_monthly_pct_change
        float cpi_annual_pct_change
        int foodkeeper_product_id
        text foodkeeper_name
        float expiry_match_score
        int pantry_min_days
        int pantry_max_days
        int refrigerate_min_days
        int refrigerate_max_days
        int freeze_min_days
        int freeze_max_days
    }

    USERS ||--o{ RECEIPTS : uploads
    RECEIPTS ||--o{ RECEIPT_ITEMS : contains
    USERS ||--o{ USER_FAVOURITES : saves
    RECIPES ||--o{ USER_FAVOURITES : favourited_as
    RECIPES ||--o{ MEAL_LOGS : logged_as
    RECIPES ||--o| RECIPE_IMAGES : has_cached_image
    KNOWN_INGREDIENTS ||--o{ FOOD_REFERENCE_CSV : enriched_into
    KNOWN_INGREDIENTS ||--o{ RECEIPT_ITEMS : matches_by_name
    KNOWN_INGREDIENTS ||--o{ FRIDGE_ITEMS : categorises
    KNOWN_INGREDIENTS ||--o{ SHOPPING_LIST : categorises
```

## Reading Notes

- `RECEIPTS -> RECEIPT_ITEMS` is the main enforced foreign-key relationship in
  the live database.
- Several relationships are application-level rather than enforced by database
  foreign keys, especially `user_id`, `recipe_id`, and ingredient-name matches.
- `FOOD_REFERENCE_CSV` is currently a processed CSV artifact, not a live
  PostgreSQL table. It is included here because it is the planned enrichment
  layer for ingredient nutrition, CPI trend, and expiry data.
- Current fridge routes use `RECEIPT_ITEMS` as the virtual fridge. `FRIDGE_ITEMS`
  exists as a table but is not the main route-backed storage today.
