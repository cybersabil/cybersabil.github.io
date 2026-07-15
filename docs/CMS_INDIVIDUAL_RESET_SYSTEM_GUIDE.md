# CyberSabil Pages CMS — Individual Reset Guide

## What was added

Every CMS editor now has a safe reset action in its page header.

### Normal settings pages

Button: **Reset one setting**

1. Open the relevant CMS page.
2. Click **Reset one setting**.
3. Select the exact setting.
4. Confirm **Reset setting**.
5. GitHub Actions restores only that setting, validates the site, commits the selected JSON file, and deploys the result.

### Cards and list pages

Pages: Tools, Downloads, Website Projects, Website Skills, Docs, FAQ, Portfolio Skills, Portfolio Projects, Timeline and Services.

Buttons:

- **Reset one card setting** — select one original item and one field.
- **Reset original order** — restores the approved order of original items while preserving custom items.

The field list also contains:

- **Poora selected card/item — Complete item** — restores the complete original item. It can also restore a deleted original item.

After restoring a deleted item, use **Reset original order** when you want it returned to its approved position.

## Important behavior

- Only the selected setting is changed.
- Other settings in the same file remain unchanged.
- Other JSON files remain unchanged.
- A separate Git commit is created for every successful reset.
- The website is validated and deployed from the same reset workflow.
- A stale reset request is rejected if a newer commit appeared after the button was clicked.
- Default items contain a hidden stable UUID, so renaming or reordering a card does not make the reset target another card.

## Custom/new cards

Custom cards are preserved during **Reset original order**. A custom card cannot be restored to an original default because it did not exist in the approved fresh-site baseline. Only the original approved items appear in the reset item dropdown.

## Approved defaults

Protected reset source files are stored in:

```text
.github/cms-defaults/data/
```

Pages CMS does not expose these files as normal editors. Do not manually edit them unless you intentionally want to redefine the approved fresh-site defaults.

## GitHub Actions requirement

The reset workflow needs permission to commit the selected JSON file. If GitHub reports a write-permission error, check:

```text
Repository Settings
→ Actions
→ General
→ Workflow permissions
→ Read and write permissions
```

Organization or enterprise policies can override repository settings.

## Reset failure messages

### Repository changed / stale request

Refresh Pages CMS, reopen the editor and run Reset again. This protection prevents an older queued reset from overwriting a newer edit.

### Selected original item was deleted

Choose **Complete item** for that item first. Then reset an individual field if required.

### Workflow failed before commit

No reset commit is created. Open the GitHub Actions run and inspect the failed validation step. Existing live-site data remains at the previous commit.
