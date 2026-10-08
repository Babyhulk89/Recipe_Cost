# RecipeCost Studio

Current source for the private RecipeCost Studio application.

## Access model

The deployed app is private-access gated. Users need an authorized RecipeCost invite or owner activation and must sign in with their own account before app features and private account data are available.

Private data includes saved recipes, grocery lists, plans, inventory, purchase history, nutrition logs, dietary profiles, family data, spending data, and event-planning data.

## Owner bootstrap secret

Do not commit the owner activation token.

Configure the AppDeploy backend secret:

`RECIPECOST_OWNER_BOOTSTRAP_TOKEN`

The backend reads it through `secrets.readSecret()`.

## Current application

This repository contains the React/Vite frontend and AppDeploy backend source used by RecipeCost Studio, including:

- Full dynamic recipe generation
- Kitchen + Seasonal Kitchen ingredient workflow
- Pantry and expiration-first cooking
- Private accounts and invites
- Saved recipes
- Grocery and inventory tracking
- Receipt intake
- Meal planner and calendar links
- Nutrition tracking
- Spending
- Family accounts
- Event planning
- Restaurant and grocery-store discovery
- Visual cookthrough generation

The older root `server.js` and migration notes are retained as legacy files and are not the current AppDeploy application entrypoint.

## Development

Install dependencies and run the Vite application using the scripts in `package.json`.

Backend routes live in `backend/index.ts`.
