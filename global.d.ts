// Ambient declaration for global stylesheet side-effect imports
// (e.g. `import "./globals.css"`). Next.js ships types for `*.module.css`
// but not plain global `*.css`, which TypeScript 6's
// `noUncheckedSideEffectImports` requires. The more specific
// `*.module.css` declaration from Next still wins for CSS-module imports.
declare module "*.css";
