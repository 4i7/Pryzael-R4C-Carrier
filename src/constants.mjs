export const FROZEN_IDENTITY = Object.freeze({
  repository: '4i7/Pryzael',
  sourceCommit: '3bba19e0be936e7b9d3554ac737d32f5cf84c846',
  sourceTree: '29c3d97126d0f11de8d5c89dddf21f23d861f257',
  canonicalSkillsTree: '4395ef86a309ed610f4860f47284d0e4da572914',
  pluginVersion: '0.3.0'
});

export const RENDERER_VERSION = 'r4c-condition-render-v1';
export const QUALIFICATION_ID = 'pryzael-r4-qualification-cea3a894-v1';
export const QUALIFICATION_PACKET_COMMITMENT = Object.freeze({
  schemaVersion: 'r4-qualification-packet-v1',
  sha256: '892a0c84f1c0adc45bb230efbb5a66cb86150def7ca6fc8fd9d5fcc38381b600',
  byteCount: 14743
});

export const CANONICAL_SKILL_PACKAGES = Object.freeze([
  'architect',
  'blast-radius',
  'figure-it-out',
  'fix-root-causes',
  'how',
  'interrogate',
  'prove-it-works',
  'sequence-verifiable-units',
  'show-me-your-work',
  'why'
]);

export const FROZEN_PATH_BLOBS = Object.freeze([
  ['skills/architect/SKILL.md', '42d4e18112804fc8340d97ee77293b29b4f55a33', 3818],
  ['skills/architect/references/design-space-gate.md', 'ac594b14243844ea3977cb58face7734fa575f7b', 2331],
  ['skills/blast-radius/SKILL.md', '97fc5875988847a8c108e98192e1a0139a604d0e', 2656],
  ['skills/figure-it-out/SKILL.md', '4d078fbcedbed860f6d92790105309e0671849a0', 3568],
  ['skills/fix-root-causes/SKILL.md', '63bfd3fa6d6a51940063dc9868c63ee445507ed4', 3131],
  ['skills/fix-root-causes/references/tdd-regression.md', '103261a92fa6842c5f4f64f00b328e9269af9e9b', 1238],
  ['skills/how/SKILL.md', '1aa1b35243e58d9ba7449f0a52658231bf8a28ef', 3401],
  ['skills/interrogate/SKILL.md', '69da4c8551b72ce4420df25fe127480be361abff', 3291],
  ['skills/interrogate/references/github-exact-head-review.md', 'f20b56a0467ecf7013eba11688227747d772b607', 5355],
  ['skills/prove-it-works/SKILL.md', '8306b0ff1a022ffb9909335cfbef6ebcdc33d2b0', 2963],
  ['skills/prove-it-works/references/create-verification-harness.md', 'c5f3172fd7de861bbc8d8701942ec59a2ba2b0d6', 2188],
  ['skills/prove-it-works/references/maintain-verification-harness.md', '2a91b0c4bd64bbf3322faf684bf2a7bbb5901a75', 1652],
  ['skills/sequence-verifiable-units/SKILL.md', '2bdebaa20cf74dcd727745d1ccc78c9f86a26570', 2926],
  ['skills/show-me-your-work/SKILL.md', 'df77d5444e33bc8331a355a6c9863f4dc7913a57', 2775],
  ['skills/show-me-your-work/assets/decision-log-template.tsv', 'db220376ecb8c582a6a4f6575a8f26469603a38d', 38],
  ['skills/why/SKILL.md', 'd1223e2fffb5862dc3ed9be2c1eafd38acccb562', 3150],
  ['skills/why/references/epistemics.md', 'e7e0d6394cbc769a81f1449554054fd5763a3c5c', 1524],
  ['skills/why/references/evidence-map.md', 'f66d16532c6f780aa0127ca2c89ddff88d445732', 1634]
].map(([path, blobSha1, byteCount]) => Object.freeze({ path, blobSha1, byteCount })));
