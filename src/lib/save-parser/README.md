# Onismith save parser

This module contains Onismith's Oxygen Not Included save-file reader and writer. It is application code, not a separately published package.

## Structure

- `binary-serializer` reads and writes little-endian primitive values and compressed byte streams.
- `parser` executes the read and write instruction streams.
- `save-structure` defines the supported save sections, data types, game objects, and known behaviors.
- `tagger` associates parser instructions with serialized types.
- `progress` converts parser activity into progress messages for the interface.

The public API is exported from `index.ts`. Application code should import from `@/lib/save-parser` rather than reaching into internal paths.

Parsing and writing are CPU-intensive and run through `src/workers/save-parser.worker.ts`. The production build bundles that entry point into a standalone browser module before Next.js creates the static export.

Onismith defaults to major-version strictness. New save-format support should include parser tests and a parse-write-parse regression check before the accepted version range is changed.
