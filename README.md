# Trolley for Tomorrow

> Eat well. Spend smart. Waste nothing.

A food decision support application helping Australians manage food budgets, plan affordable meals, and reduce food waste. Built as part of FIT5120 Industry Experience Studio at Monash University.

For a detailed breakdown of what has been built, see [docs/PROJECT_STATUS.md](docs/PROJECT_STATUS.md)

---
## The Problem

Australia wastes 7.6 million tonnes of food per year. 32% of Australian households experienced food insecurity in 2024. Nearly two thirds of Australians experience decision fatigue around meal planning. This app addresses all three problems through a single unified tool.

---

## What the App Does

- Generates a personalised food score based on height, weight, budget, and dietary requirements
- Recommends affordable meals ranked by nutrition, cost, and preparation feasibility
- Scans supermarket receipts via OCR to log purchases automatically
- Tracks food waste and shows the dollar cost of what gets thrown out
- Shows nearby stores and specials to help users shop smarter

---

## Team

| Name | Role | Branch |
|---|---|---|
| Saubhagya Das | Data Science | `das` |
| Arsh | Data Science | `arsh` |
| Jasmine | IT | `jasmine` |
| Karl | IT | `karl` |
| Shimmin | BIS | `shimmin` |

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Stable, presentation-ready at all times |
| `production` | Live deployed build, only merged from main at iteration submission |
| `das` | Saubhagya's working branch |
| `arsh` | Arsh's working branch |
| `jasmine` | Jasmine's working branch |
| `karl` | Karl's working branch |
| `shimmin` | Shimmin's working branch |

**Rules:**
- Never push directly to `main` 
- At least one other team member must review before merging

---

## Project Structure
```
trolley-for-tomorrow/
├── frontend/       # React frontend (IT students)
├── backend/        # Flask backend + recommendation engine (IT + DS students)
├── data/           # Raw datasets, pipelines, notebooks (DS students)
├── tests/          # Integration and end to end tests
└── docs/           # API, schema, and architecture documentation
```

See each folder's README for detailed setup instructions.

### Versioning Convention

All CHANGELOG files across the project follow semantic versioning.

| Version Format | When to use |
|---|---|
| `1.0.0` | First release of a module |
| `1.0.1` | Small bug fix to existing functionality |
| `1.1.0` | New feature added to an existing module |
| `2.0.0` | Breaking change such as restructuring or switching tech stack |

#### Examples

- `1.0.0` — initial backend setup
- `1.0.1` — fix bug in health check endpoint
- `1.1.0` — add nutrition scoring logic
- `1.2.0` — add receipt scanning
- `2.0.0` — switch from Flask to FastAPI

#### Rules

- Last number = bug fix
- Middle number = new feature added
- First number = breaking change
- Always update the relevant module CHANGELOG when you make a change
- Never update another person's module CHANGELOG

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | TBC |
| Backend | Flask (Python 3.14) |
| Database | PostgreSQL (Neon) |
| Hosting | Render |
| Data Processing | Python, Pandas, Jupyter |

---

## Getting Started

### Step 1 - Clone the repo
```
git clone https://github.com/dehydrated-sushi/trolley-for-tomorrow.git
cd trolley-for-tomorrow
```

### Step 2 - Switch to your branch

Each person works only on their own branch. Never work on main directly.
```
git checkout das        # Saubhagya
git checkout arsh       # Arsh
git checkout jasmine    # Jasmine
git checkout karl       # Karl
git checkout shimmin    # Shimmin
```

### Step 3 - Check you are on the right branch
```
git branch
```

The branch with a `*` next to it is the one you are currently on. Make sure it is yours before doing anything.

### Step 4 - Before you start working, always pull latest changes
```
git pull origin main
```

This makes sure you have the latest code before you start. Do this every single time before you begin a work session.

---

## How to Save and Push Your Work

### Step 1 - Check what files you have changed
```
git status
```

### Step 2 - Stage your changes

To add everything you changed:
```
git add .
```

To add a specific file only:
```
git add backend/modules/auth/routes.py
```

### Step 3 - Commit with a proper message
```
git commit -m "feat(karl/auth): add login endpoint"
```

See the Commit Message Convention section below for the full format.

### Step 4 - Push to your branch
```
git push origin das       # replace my name with your branch name
```


---

## How to Update Your Branch with Latest Main

If main has been updated and you want those changes on your branch:
```
git checkout das          # make sure you are on your branch not mine's
git pull origin main      # pull latest main into your branch
```

---

## Commit Message Convention

All team members must follow this format for every commit:
```
type(who/module): what you did
```

### Types

| Type | When to use |
|---|---|
| `feat` | Adding a new feature |
| `fix` | Fixing a bug |
| `docs` | Documentation changes only |
| `data` | Data cleaning or processing work |
| `test` | Adding or updating tests |
| `refactor` | Restructuring code without changing behaviour |
| `style` | Formatting only, no logic changes |

### Examples
```
feat(das/food-score): add BMI calculation to food score calculator
fix(karl/auth): resolve JWT token expiry bug
docs(arsh/meal-ranker): update README with formula explanation
data(arsh/pipelines): clean and standardise AUSNUT nutrition data
test(jasmine/meal-plan): add unit tests for budget filtering logic
refactor(das/ocr-engine): improve receipt text parsing accuracy
```

### Rules

- Always include your name and the module you worked on
- Be specific about what you did, not just "update" or "fix stuff"
- One commit per logical change, do not bundle unrelated work into one commit
- If you are unsure what type to use, ask Saubhagya

---


## Common Commands Quick Reference

| What you want to do | Command |
|---|---|
| Check which branch you are on | `git branch` |
| Switch to your branch | `git checkout das` |
| Pull latest changes from main | `git pull origin main` |
| See what files you changed | `git status` |
| Stage all changes | `git add .` |
| Commit your changes | `git commit -m "type(who/module): message"` |
| Push to your branch | `git push origin das` |
| See commit history | `git log --oneline` |

---

## Unit

FIT5120 Industry Experience Studio
Monash University — 2026 Semester 1