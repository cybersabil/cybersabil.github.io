# Website Phase 2 — Manual Collision Test Checklist

Run only on:

```text
feature/chatgpt-custom-dashboard-v2
http://127.0.0.1:8082/admin1/#/category/website
```

Do not promote to `main`.

## Test 1 — Object field round trip

1. Website → Brand & Hero.
2. Change `badge` by adding ` [TEST]`.
3. Review.
4. Save.
5. Wait for local auto-sync.
6. Verify local website.
7. Restore the original value and save again.

Expected:

- one affected file: `data/site.json`;
- exact before/after review;
- no unrelated file change.

## Test 2 — Select field round trip

1. Website → Basic Website Design.
2. Change one select value.
3. Review and save.
4. Verify local website.
5. Restore original value.

Expected:

- one affected file: `data/design.json`;
- valid option only;
- Pages CMS-compatible JSON object.

## Test 3 — Temporary card lifecycle

Use Website Skills because it has only two visible fields.

1. Add a new card.
2. Enter title: `Admin1 temporary collision test`.
3. Enter a short description.
4. Review and save.
5. Refresh Admin1.
6. Move the temporary card up.
7. Edit its description.
8. Review and save.
9. Delete the temporary card.
10. Review and save.

Expected:

- one UUID generated once;
- UUID unchanged during edit/reorder;
- exact add/move/edit/delete review;
- final JSON returns to the original card count;
- existing card UUIDs remain unchanged.

## Test 4 — Two-tab stale SHA block

1. Open Admin1 in Tab A and Tab B.
2. Refresh both tabs.
3. In Tab A change one harmless Website field and save.
4. In Tab B change a different field in the same JSON file.
5. Attempt save from Tab B.

Expected:

```text
409 conflict
Save blocked
No partial commit
```

Then refresh Tab B and verify Tab A's saved value is preserved.

## Test 5 — Cross-file atomic save

1. Change one field in `data/site.json`.
2. Change one field in `data/sections.json`.
3. Add a temporary card in `data/skills.json`.
4. Review and save together.

Expected:

- three files in one commit;
- all three update together;
- no partial save;
- delete/restore all temporary changes afterward.

## Test 6 — Pages CMS compatibility check

Because Pages CMS remains the permanent safe editor:

1. Inspect the same Website JSON file in Pages CMS.
2. Confirm labels and values load normally.
3. Do not save test values to production `main`.
4. Compare Admin1-generated JSON shape with `.pages.yml`.

Expected:

- known fields remain normal strings/selects;
- unknown keys are preserved;
- `_cmsResetId` is preserved;
- no `.pages.yml` change.

## Pass rule

Website Audit Pass 2 is complete only after Tests 1–6 pass and all temporary values are restored.
