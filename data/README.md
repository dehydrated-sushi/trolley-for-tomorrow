# Data

Datasets and processing pipelines for the recommendation engine.

## Structure

```
data/
├── raw/            # Source datasets (gitignored — not tracked)
├── processed/      # Cleaned datasets ready for the backend
├── pipelines/      # Python scripts that clean raw data into processed data
└── notebooks/      # Jupyter notebooks for exploration and analysis
```

## Notes

- `raw/` is in `.gitignore` because raw datasets are too large for Git. If you need them, ask Saubhagya.
- Cleaned output goes in `processed/` and should be committed.
- Each pipeline script in `pipelines/` should read from `raw/` and write to `processed/`.
