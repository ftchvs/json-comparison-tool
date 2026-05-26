# JSON Comparison Tool

A small open-source sample app for comparing JSON payloads in a browser. It is built with Next.js, TypeScript, Tailwind CSS, and a few shadcn/ui-style primitives.

Use it as a reference for:

- Comparing two JSON documents with a server-side API route.
- Highlighting added and removed JSON values side by side.
- Filtering the comparison to a nested dot-path such as `customer.tier`.
- Uploading local `.json` files without storing them.

## Demo Flow

1. Paste JSON into the original and updated input panels, or upload two `.json` files.
2. Optionally enter a dot-path filter, for example `customer.tier`.
3. Click **Compare JSON**.
4. Review the full diff or the filtered diff.

The app ships with sample payloads so it is usable immediately after startup.

## Tech Stack

- [Next.js](https://nextjs.org/) Pages Router
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [jsdiff](https://github.com/kpdecker/jsdiff)

## Getting Started

```sh
git clone https://github.com/ftchvs/json-comparison-tool.git
cd json-comparison-tool
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```sh
npm run dev        # Start the local development server
npm run lint       # Run Next.js linting
npm run typecheck  # Run TypeScript checks
npm run build      # Build the production app
npm run start      # Start the production server after building
```

## Project Structure

```txt
components/
  JsonComparisonWithFilter.tsx  # Main comparison UI
  ui/                           # Local UI primitives
pages/
  api/compare-and-filter.ts     # JSON comparison API route
  api/compare.ts                # Compatibility alias for the comparison route
  index.tsx                     # Home page
styles/
  globals.css                   # Tailwind base styles and design tokens
```

## API

`POST /api/compare-and-filter`

Request body:

```json
{
  "json1": "{\"customer\":{\"tier\":\"standard\"}}",
  "json2": "{\"customer\":{\"tier\":\"premium\"}}",
  "filter": "customer.tier"
}
```

Response body:

```json
{
  "diff": ["-   \"tier\": \"standard\"", "+   \"tier\": \"premium\""],
  "summary": "Found 2 changed parts between the JSON payloads.",
  "filteredDiff": ["- \"standard\"", "+ \"premium\""]
}
```

## Privacy

The demo compares JSON in a local Next.js API route. Uploaded files are read in the browser and sent as text to the comparison endpoint; the app does not persist payloads.

Do not paste secrets into a deployed public instance unless you control and trust that deployment.

## Contributing

Contributions are welcome. Please open an issue or pull request with a clear description of the change and run:

```sh
npm run lint
npm run typecheck
npm run build
```

## License

MIT. See [LICENSE](LICENSE).
