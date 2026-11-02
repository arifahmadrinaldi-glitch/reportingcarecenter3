<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep Daily Activity's compact table separate from its full-detail dialog and reuse the activity form for editing, so presentation changes do not remove fields or editing access.
- Own the shared Care Center selection in the dashboard route and pass it to Daily Activity; use filterCareCenterRows with layanan for tickets and product for activities, deriving all chart groups and personnel/year options from scoped rows (or all rows for the combined selection) to keep both dashboards consistent.
- Store schedule identities, normal roster patterns and per-month overrides separately within schedule JSON; this preserves legacy rows and prevents leave/backup from propagating into new months.
- Keep Indonesian national holiday dates in a browser-safe calendar module with explicit yearly coverage; unverified religious dates must remain manually editable rather than guessed.
- Use shared browser-safe schedule statistics for both tables and Excel exports so combined shifts, backup coverage and regular-relative totals stay consistent.
