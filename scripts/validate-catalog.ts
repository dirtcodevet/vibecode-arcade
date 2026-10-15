#!/usr/bin/env node
// Admit catalog/shelf.json, or any package folders passed as arguments, against
// the same rules the desktop shell runs. Exit 1 on the first failure.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPackage, checkShelf } from '../src/framework/catalog.ts';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));

function printIssues(title: string, issues: { where: string; reason: string }[]): void {
  console.error(title);
  for (const issue of issues) console.error(`  ${issue.where}: ${issue.reason}`);
}

const targets = process.argv.slice(2);

if (targets.length === 0) {
  const report = await checkShelf(repoRoot);
  if (!report.ok) {
    printIssues('catalog/shelf.json failed admission:', report.issues);
    process.exit(1);
  }
  const count = report.games.length;
  console.log(`catalog/shelf.json: ${count} ${count === 1 ? 'game' : 'games'} admitted`);
  for (const game of report.games) {
    console.log(`  ${game.manifest.slug}  ${game.packageDir}`);
  }
  process.exit(0);
}

let failed = false;
for (const target of targets) {
  const dir = resolve(target);
  const result = await checkPackage(dir);
  if (result.admission.ok) {
    const slug = (result.manifest as { slug?: string }).slug ?? dir;
    console.log(`admitted ${slug}`);
  } else {
    failed = true;
    printIssues(`${dir} failed admission:`, result.admission.violations.map((v) => ({ where: v.rule, reason: v.reason })));
  }
}
process.exit(failed ? 1 : 0);
