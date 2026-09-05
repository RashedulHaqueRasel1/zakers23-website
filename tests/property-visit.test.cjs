const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const projects = require('../src/data/miami-projects.json');
const compile = (file) => ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;

function setup(status = 200, result = { id: 123 }) {
  const calls = [];
  const base = { require, Buffer, AbortSignal, URL, process: { env: { FOLLOWUP_BOSS_API_KEY: 'test-key' } }, console: { error() {} } };
  const access = { ...base, exports: {} };
  vm.runInNewContext(compile('src/lib/server/inquiry-access.ts'), access);
  const route = { ...base, exports: {},
    require: (name) => name === '../../../lib/server/inquiry-access' ? access.exports : name === '../../../data/miami-projects.json' ? projects : require(name),
    fetch: async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response(status === 204 ? null : JSON.stringify(result), { status }); },
  };
  vm.runInNewContext(compile('src/app/api/property-visit/route.ts'), route);
  return { access: access.exports, calls,
    post: (body, token = access.exports.createInquiryAccess(123)) => route.exports.POST({ url: 'https://example.com/api/property-visit', cookies: { get: () => token ? { value: token } : undefined }, json: async () => body }),
  };
}

test('records each property click as an inquiry for the original contact and renews access', async () => {
  const { post, calls } = setup();
  for (const project of [projects[0], projects[1], projects[0]]) {
    const response = await post({ slug: project.slug, personId: 999, name: 'fake property' });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get('set-cookie').includes('Max-Age=31536000'));
    assert.ok((await response.json()).expiresAt > Date.now());
    const event = calls.at(-1).body;
    assert.equal(event.type, 'General Inquiry');
    assert.equal(event.person.id, 123);
    assert.ok(event.message.includes(project.name));
    assert.ok(event.message.includes(`https://example.com/property/${project.slug}`));
    assert.ok(event.message.includes(project.neighborhood));
    assert.ok(event.message.includes(project.priceFrom));
  }
  assert.equal(calls.length, 3);
});
test('requires a signed, unexpired contact session before tracking', async () => {
  const { post, calls, access } = setup();
  const expired = access.createInquiryAccess(123, Date.now() - 366 * 86400000);
  for (const token of ['', 'true', expired, access.createInquiryAccess(123).replace(/^123/, '999')]) {
    assert.equal((await post({ slug: projects[0].slug }, token)).status, 401);
  }
  assert.equal(calls.length, 0);
});
test('rejects malformed or nonexistent properties without a CRM request', async () => {
  const { post, calls } = setup();
  assert.equal((await post(null)).status, 400);
  assert.equal((await post({ slug: 12 })).status, 400);
  assert.equal((await post({ slug: 'not-a-property' })).status, 404);
  assert.equal(calls.length, 0);
});
test('does not claim a rejected or ignored visit was saved', async () => {
  for (const status of [204, 401, 429, 500]) {
    const { post } = setup(status);
    assert.equal((await post({ slug: projects[0].slug })).status, 502);
  }
  const { post } = setup(200, { id: 999 });
  assert.equal((await post({ slug: projects[0].slug })).status, 502);
});
