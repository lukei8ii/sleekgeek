# React + TypeScript + Vite

## Food Data Strategy (Hybrid)

This repo now supports a hybrid data strategy for package and portion metadata:

1. Official Sleekgeek food list as the base food taxonomy.
2. Public-reference package and serving standards as a no-account overlay.
3. Optional manual edits for edge cases.

The official Sleekgeek food list remains the base taxonomy in `public/data/foods/*.json`.
Runtime metadata overlays are merged from `public/data/foods/overrides.json`.

### Files

- Base official list: `public/data/foods/*.json`
- Runtime overlay used by app: `public/data/foods/overrides.json`
- Enrichment workspace: `public/data/foods/enrichment/`
  - `public-size-standards.json`
  - `approved-overrides.json`

### Scripts

- `npm run generate:food-data`
  - Rebuild official Sleekgeek split JSON files.
- `npm run generate:overlay-template`
  - Creates `public/data/foods/overlay-template.json` with all food IDs for easier manual editing.
- `npm run build:public-overrides`
  - Builds `approved-overrides.json` from curated public-reference size standards (no API keys).
- `npm run apply:approved-overrides`
  - Copies approved overlay edits into runtime `overrides.json`.

## Deploying to GitHub Pages

This repo is configured to deploy automatically to GitHub Pages via GitHub Actions.

One-time repo setup:

1. Open repository settings in GitHub.
2. Go to Pages.
3. Under Build and deployment, set Source to GitHub Actions.

After that, every push to main triggers deployment using [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml).

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```
