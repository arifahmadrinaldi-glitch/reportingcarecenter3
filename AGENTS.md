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
- Parse Telegram category arguments and calculate open-ticket resumes in the shared browser-safe telegram-report module; use canonical Care Center classification and page through all matching tickets before counting, so category totals are complete. Keep Telegram credentials in the linked connector and verify the webhook secret before processing updates.
- Deliver login OTP through an authenticated server function that reads the approved account's current OTP and uses the shared Telegram connector helper; never expose bot credentials or accept arbitrary OTP delivery payloads from the browser.
- Store schedule identities, normal roster patterns and per-month overrides separately within schedule JSON; this preserves legacy rows and prevents leave/backup from propagating into new months.
- Track the Vsat identity period in schedule JSON and rotate name/NIK/phone columns together during initialization, including legacy saves; keep shift cells and patterns position-based so identity rotation never changes shift accounting.
- Version roster configuration in schedule JSON and adapt legacy team data only in the editable draft until explicitly saved; derive table and export rows from team membership, and anchor staggered cycles to the reference date to keep both teams aligned across months.
- Keep Indonesian national holiday dates in a browser-safe calendar module with explicit yearly coverage; unverified religious dates must remain manually editable rather than guessed.
- Use shared browser-safe schedule statistics for both tables and Excel exports so combined shifts, backup coverage and regular-relative totals stay consistent.
