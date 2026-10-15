## Adding a game?

- [ ] Package folder in this repo (or a submodule) with `arcade.json` at its root
- [ ] `arcade.json` is listed in `catalog/shelf.json` as `{ "packageDir": "..." }`
- [ ] `pnpm validate:catalog` admits the shelf
- [ ] `pnpm validate:catalog -- path/to/package` admits the new package
- [ ] Source URL is real and public (not `github.com/example/`)
- [ ] No price, DRM, account, tracking, or affiliate fields

Human review still decides what merges. CI only checks the rules in `src/framework/`.
