# 60 Second Demo Script

## Setup

Open a terminal in the repository root.

## Script

1. Run the built-in demo.

   ```sh
   gha-bom demo
   ```

   Say: "gha-bom works even before I point it at a real repo. The demo shows a risky GitHub Actions workflow and summarizes the workflow attack surface."

2. Scan the risky example directly.

   ```sh
   gha-bom scan examples/risky
   ```

   Say: "It inventories actions, refs, permissions, secrets, runners, triggers, and release paths. It also gives findings with severity and confidence."

3. Show a pull-request style diff.

   ```sh
   gha-bom diff examples/baseline/old.json examples/baseline/new.json --format markdown
   ```

   Say: "The diff is the core review loop. It shows what changed in the CI/CD attack surface."

4. Open an HTML report.

   ```sh
   gha-bom demo --format html --output gha-bom-demo.html
   ```

   Say: "The HTML report is self-contained, so it can be shared as a build artifact."

5. Explain the supply-chain point.

   Say: "CI/CD workflows are part of the software supply chain because they build, sign, package, and deploy software. gha-bom makes that layer visible without calling the GitHub API."

## Recording a terminal GIF later

Use the commands above as the canonical flow when a real terminal GIF is added.

Recommended capture shape:

1. Build first so the local CLI output matches the published package.

   ```sh
   npm run build
   ```

2. Record these commands only.

   ```sh
   gha-bom demo
   gha-bom scan examples/risky --badge
   gha-bom diff examples/baseline/old.json examples/baseline/new.json --format markdown
   ```

3. Export the GIF to `docs/assets/demo.gif`.
4. Keep the recording short, readable, and free of local absolute paths.
5. Update the README demo preview to link to the GIF once the asset exists.
