# Onismith

Onismith is a browser based save editor for Oxygen Not Included.

It reads and writes `.sav` files locally in your browser. Your save is not uploaded to a server.

## What it does

Onismith can inspect colony data and edit Duplicants, creatures, geysers, planets, materials, and raw save values. The Duplicant editor covers identity, appearance, reactions, traits, attributes, health, interests, skills, and effects.

Save parsing runs in a browser worker, so large files do not freeze the interface. The parser lives inside the app at `src/lib/save-parser`.

Keep a backup of important saves. ONI updates can change the save format, and compatibility with newer formats is best effort.

## Run locally

You need Node.js 24 or newer and npm 11 or newer.

```bash
npm install --no-package-lock
npm run dev
```

Open `http://localhost:3000` and load a `.sav` file.

Useful commands:

```bash
npm run check
npm run build
npm run preview
npm run deploy
```

`npm run check` formats the code, runs linting and type checks, validates assets, and runs the tests.

## Save locations

- Windows: `Documents\Klei\OxygenNotIncluded\save_files`
- macOS: `~/Library/Application Support/unity.Klei.Oxygen Not Included/save_files`
- Linux: `~/.config/unity3d/Klei/Oxygen Not Included/save_files`

## Deployment

The app is a static Next.js export served by Cloudflare Workers assets.

The canonical production URL is https://onismith.com/. It is defined in `src/lib/site.ts` and shared by the homepage metadata, structured data, robots file, and sitemap. Only the homepage allows indexing. Editor routes and settings use `noindex` because they depend on local session data or preferences.

```bash
npx wrangler login
npm run deploy
```

## Special Thanks
Special thanks to https://github.com/RoboPhred/oni-duplicity and https://github.com/cLonata/duplicity.
