# Import Ownership Contract

## Owner

The sole and exclusive owner of all file import operations is `/editor`.

## Allowed Import Entry Points

| Entry Point               | Location                                                            | Purpose                         |
| ------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| editor-actions-controller | apps/web/src/app/(main)/editor/src/controllers/                     | Menu-driven file import         |
| EditorArea paste handler  | apps/web/src/app/(main)/editor/src/components/editor/               | Paste-based content import      |
| paste-classifier          | apps/web/src/app/(main)/editor/src/extensions/                      | Content classification pipeline |
| Backend file-extract      | apps/backend/editor-runtime/controllers/extract-controller.mjs      | Server-side file extraction     |
| Backend text-extract      | apps/backend/editor-runtime/controllers/text-extract-controller.mjs | Server-side text extraction     |

## Prohibited Import Paths

| Path             | Status      | Enforcement                                        |
| ---------------- | ----------- | -------------------------------------------------- |
| directors-studio | DEACTIVATED | ScriptUploadZone replaced with redirect to /editor |
| Any other page   | PROHIBITED  | No import UI or extraction logic allowed           |

## Cross-Page Integration Contract

If any page needs to "open a screenplay":

1. Redirect to `/editor` with the project ID
2. Or use an `open-in-editor` action
3. No second pipeline or extraction logic

## Tests That Enforce This Contract

| Test                                 | Location                               | What It Verifies                  |
| ------------------------------------ | -------------------------------------- | --------------------------------- |
| import-ownership-regression.test.mjs | apps/backend/editor-runtime/**tests**/ | No file input in directors-studio |
| release-gates.test.mjs               | apps/backend/editor-runtime/**tests**/ | Critical runtime readiness        |
| pipeline-stages.test.mjs             | apps/backend/editor-runtime/**tests**/ | Pipeline reaches settled state    |

## Deep Health Endpoint

`GET /health/deep` returns comprehensive runtime proof including:

- Karank engine readiness
- Python availability
- Antiword/DOC path status
- Suspicion model configuration
- Final review configuration
- Import pipeline probe results

## Last Updated

2026-04-13
