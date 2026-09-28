# RecipeCost Railway Bridge

This repository provides a Railway-hosted bridge to the current RecipeCost Studio version 6 deployment while the backend is migrated away from Hatchable.

## Current behavior
- Serves the complete updated RecipeCost Studio interface through Railway.
- Preserves existing Hatchable-backed authentication, database state, recipe generation, grocery/planner APIs, venue search, meal/snack/drink modes, meal-prep controls, and BBQ/grilling updates.
- Does not contain credentials or manager email addresses.

## Migration note
This is a bridge deployment, not the final independent backend. The next phase is to replace Hatchable-owned auth/database/AI services with Railway-native or other portable services.
