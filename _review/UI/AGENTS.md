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

- Keep the SUTRA preview as a single client-side workspace on `/` with view switching; the supplied screenshots request a visual redesign without a backend, so preview interactions stay local.
- Centralize all application visual tokens and reusable presentation rules in `src/styles.css` so the reference-inspired interface stays consistent across screens.
