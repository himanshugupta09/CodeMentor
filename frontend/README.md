# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler


## Quickstart (local)

Install dependencies and start the dev server:

```bash
cd frontend
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Dev server uses Vite (HMR). By default it serves at `http://localhost:5173`.

## Project layout

- `src/` — React source code
- `public/` — static assets
- `index.html` — app entry

## Environment

If the frontend needs to call a local backend during development, add a `.env` (or Vite env) variable like:

```
VITE_API_BASE_URL=http://localhost:5000/api
```

## Notes

- The frontend expects the backend API to provide JWT-based auth and the endpoints described in the project README at the repository root.
- For production deployment, configure your hosting to proxy API requests to the backend service.
