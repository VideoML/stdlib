# Hyperframes catalog inventory

`manifest.json` is an inventory of the registry and shader keys at the pinned upstream revision, not an implementation catalog. IDs use `kind/name`; duplicate display titles do not collapse entries. The root counts distinguish 456 registry entries and 14 shader keys. `packet-map.json` is a snapshot of the 92 C packet identities and exact paths from the VideoML Kanbus board; shaders are assigned to P08. `NOTICE.md` describes source declarations and the unresolved asset-rights review.

To verify against the pinned, clean source checkout:

```sh
HYPERFRAMES_SOURCE=/path/to/hyperframes npm run test:catalog
node scripts/import-hyperframes-catalog.mjs --upstream /path/to/hyperframes --check
```

To regenerate the inventory, omit `--check`. The importer preserves existing implementation metadata and status while rejecting changes to upstream identity, provenance or packet mappings. It fails on an incorrect Git revision, modified/untracked relevant upstream sources, unknown or duplicate identities, orphan directories, missing listed directories, mismatched metadata, missing packet mappings, or duplicate packet mappings. `--check` verifies the immutable upstream projection and validates current counts while preserving implementation metadata. Verified entries require a nonempty parameter schema and at least one fixture; promotion is never automatic.

`parameterSchema: null`, empty fixture arrays, and unreviewed dependency and asset-rights fields are intentional unknowns, not assertions that there are no parameters, assets, or dependencies. Upstream files are named for later investigation; no upstream media is approved for redistribution by this inventory. Catalog implementation packets resolve these fields before claiming an effect is verified.
