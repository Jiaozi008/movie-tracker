---
type: project
created: 2026-06-14
updated: 2026-06-18
---

# Technical Decisions

## TV Show Rewatch Logic
- **Iterative Recommendation Rule**: For TV shows, the recommended `watchIteration` remains the current iteration `maxIteration` until at least one record of this iteration is marked as `status === MovieStatus.WATCHED` (完结).
- **Rationale**: TV shows are logged episode-by-episode (which creates multiple records). Recommending `maxIteration + 1` on every new record before completion incorrectly increments the rewatch iteration.
- **TV Show Episode Auto-increment**: For TV shows, when inheriting habits from the last watched record under the same watch iteration:
  - Automatically increment the watched episode count by `1` (i.e. `lastEpisode + 1`), capped at the `totalEpisodes` if defined.
  - Automatically upgrade the record status to `MovieStatus.WATCHED` (完结) if the incremented episode count reaches `totalEpisodes`.
  - If a new iteration is recommended (rewatch), reset the watched episode count to `'0'` and status to `MovieStatus.WATCHING`.


## Cloudflare Pages Deployment
- **Method**: The project is configured with Cloudflare Pages linked to GitHub. Code pushes to the `main` branch automatically trigger production deployments.
- **Natural Language Deployment Command**: The AI assistant is instructed to automatically trigger building and deployment whenever the user says "帮我部署到cloudflare" or "部署".
