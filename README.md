# Anonymous project page

A static, English-language research project page for anonymous peer review. The current version is a template: it contains no actual research results or downloadable materials.

## Edit the content

Edit `index.html` directly. Search for `EDIT:` comments and square-bracketed placeholders.

- Update the browser title, description, project label, paper title, and summary.
- Fill in the abstract, method, and results sections.
- Replace the teaser placeholder with a real figure and descriptive alternative text.
- Add files under `assets/` (for example `teaser.png`, `paper.pdf`, `demo.mp4`, and `supplement.pdf`). Use relative links such as `assets/paper.pdf`.
- Replace resource status labels with real links only when the files exist. Replace the video placeholder with a native HTML video player; a sample is in its HTML comment.
- Remove the template notice and placeholder badges only after their content is replaced. Delete unused sections and navigation links.

## Anonymity before publication

Keep author names, affiliations, personal links, acknowledgments, and identifying file metadata out of the review version. Check figures, video/audio, PDF properties, file names, and repository history as well as the visible page. Use an anonymous Git author name and the account's GitHub-provided noreply email for every commit. Hiding a profile or email does not remove identity details from earlier commits.

The page has no analytics, cookies, remote fonts, embedded third-party media, or external scripts. The `noindex` directive requests search-engine exclusion; it does not restrict access or guarantee anonymity. This is a public website and public repository.

## Hosting

GitHub Pages: deploy from branch `main`, folder `/ (root)`. No build tools are required. `.nojekyll` disables Jekyll processing.

Before submitting the URL, follow the venue's current rules for external links and supplementary materials. Retain the submitted version unchanged after the deadline where required; a moving website is not a substitute for any required fixed submission archive.
