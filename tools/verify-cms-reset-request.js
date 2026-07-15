#!/usr/bin/env node
/* Fail-safe stale-request guard for Pages CMS reset actions.
   Prevents a queued reset from overwriting a newer CMS/GitHub commit. */
'use strict';
const { execFileSync } = require('child_process');

function verifyRequest({ payload, currentSha, repository, refName }) {
  if (!payload || payload.source !== 'pages-cms') throw new Error('Request source must be pages-cms');
  const repo = payload.repository;
  if (!repo || typeof repo !== 'object') throw new Error('Pages CMS repository metadata is missing');
  const expectedSha = String(repo.sha || '').toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) throw new Error('Pages CMS commit SHA is invalid');
  if (String(currentSha || '').toLowerCase() !== expectedSha) {
    throw new Error('This reset request is stale because the repository changed. Refresh Pages CMS and run Reset again.');
  }
  const expectedRepo = `${repo.owner}/${repo.repo}`;
  if (repository && expectedRepo.toLowerCase() !== String(repository).toLowerCase()) {
    throw new Error(`Repository mismatch: payload=${expectedRepo}, workflow=${repository}`);
  }
  if (refName && repo.ref && String(repo.ref) !== String(refName)) {
    throw new Error(`Branch mismatch: payload=${repo.ref}, workflow=${refName}`);
  }
  return { ok: true, sha: expectedSha, repository: expectedRepo, ref: repo.ref };
}

function main() {
  try {
    const raw = process.env.PAGES_CMS_PAYLOAD;
    if (!raw) throw new Error('PAGES_CMS_PAYLOAD is missing');
    const payload = JSON.parse(raw);
    const currentSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    const result = verifyRequest({
      payload,
      currentSha,
      repository: process.env.GITHUB_REPOSITORY,
      refName: process.env.GITHUB_REF_NAME,
    });
    console.log(`Fresh reset request verified: ${result.repository}@${result.sha.slice(0, 12)} (${result.ref})`);
  } catch (error) {
    console.error(`CMS reset request verification failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) main();
module.exports = { verifyRequest };
