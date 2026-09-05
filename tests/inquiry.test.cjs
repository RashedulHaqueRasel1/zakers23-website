const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = ts.transpileModule(fs.readFileSync('src/app/api/inquiry/route.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup(response, apiKey = 'test-key') {
  const calls = [];
  const sandbox = {
    exports: {}, require, Buffer, AbortSignal,
    process: { env: { FOLLOWUP_BOSS_API_KEY: apiKey } },
    console: { error() {} },
    fetch: async (url, init) => {
      calls.push({ url, ...init, payload: JSON.parse(init.body) });
      if (response instanceof Error) throw response;
      return response;
    },
  };
  const access = { ...sandbox, exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server/inquiry-access.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, access);
  sandbox.require = (name) => name === '../../../lib/server/inquiry-access' ? access.exports : require(name);
  vm.runInNewContext(source, sandbox);
  return { calls, post: (body) => sandbox.exports.POST({ json: async () => body }) };
}

const inquiry = {
  name: 'Test Buyer', email: ' BUYER@example.com ', phone: '+1 555 010 1234',
  message: 'I would like a private tour.', source: 'Website',
  pageUrl: 'https://example.com/property/test-property',
  details: { Budget: '$3M to $5M', 'Primary goal': 'Vacation home', Timeline: '1–2 years', 'Interested in': 'Test property' },
};

for (const status of [200, 201]) {
  test(`saves all consultation fields in one event (${status})`, async () => {
    const { post, calls } = setup(new Response(JSON.stringify({ id: 123 }), { status }));
    const response = await post(inquiry);
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie');
    assert.ok(cookie.includes('inquiry-access='));
    assert.ok(cookie.includes('HttpOnly'));
    assert.ok(cookie.includes('Max-Age=31536000'));
    assert.equal((await response.json()).success, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://api.followupboss.com/v1/events');
    const { person, message, type } = calls[0].payload;
    assert.equal(type, 'General Inquiry');
    assert.equal(person.firstName, 'Test');
    assert.equal(person.lastName, 'Buyer');
    assert.equal(person.emails[0].value, 'buyer@example.com');
    assert.equal(person.phones[0].value, inquiry.phone);
    for (const value of [inquiry.name, inquiry.phone, inquiry.message, inquiry.pageUrl, ...Object.values(inquiry.details)]) assert.ok(message.includes(value));
  });
}
for (const status of [204, 400, 401, 429, 500]) {
  test(`does not claim success when FUB ignores or rejects inquiry (${status})`, async () => {
    const { post } = setup(new Response(null, { status }));
    const response = await post(inquiry);
    assert.equal(response.status, 502);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.ok((await response.json()).error);
  });
}
test('rejects malformed input without sending it to CRM', async () => {
  for (const body of [null, [], { email: 123 }, { email: 'bad' }, { email: 'a@b.com', details: [] }]) {
    const { post, calls } = setup();
    assert.equal((await post(body)).status, 400);
    assert.equal(calls.length, 0);
  }
});
test('handles optional fields and property/neighborhood inquiry context', async () => {
  const { post, calls } = setup(new Response('{"id":123}'));
  assert.equal((await post({ email: 'a@b.com', details: { Neighborhood: 'Brickell' } })).status, 200);
  assert.ok(calls[0].payload.message.includes('Neighborhood: Brickell'));
  assert.ok(calls[0].payload.message.includes('Phone: Not provided'));
  assert.equal(calls[0].payload.person.phones, undefined);
});
test('handles missing configuration without exposing credentials', async () => {
  const { post, calls } = setup(undefined, '');
  assert.equal((await post(inquiry)).status, 503);
  assert.equal(calls.length, 0);
});
test('handles network failure and malformed success responses', async () => {
  for (const upstream of [new Error('timeout'), new Response('{}'), new Response('invalid json')]) {
    const { post } = setup(upstream);
    assert.equal((await post(inquiry)).status, 502);
  }
});


test('property access rejects missing, forged, malformed and expired cookies', () => {
  const sandbox = { exports: {}, require, Buffer, process: { env: { FOLLOWUP_BOSS_API_KEY: 'test-key' } } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/server/inquiry-access.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, sandbox);
  const { createInquiryAccess, hasInquiryAccess, INQUIRY_ACCESS_MAX_AGE } = sandbox.exports;
  const now = 1800000000000;
  const token = createInquiryAccess(123, now);
  assert.equal(hasInquiryAccess(token, now), true);
  assert.equal(hasInquiryAccess(token, now + INQUIRY_ACCESS_MAX_AGE * 1000), false);
  for (const invalid of [undefined, '', 'true', '9999999999.fake', token + '.extra', token.replace(/^./, '9')]) {
    assert.equal(hasInquiryAccess(invalid, now), false);
  }
  sandbox.process.env.FOLLOWUP_BOSS_API_KEY = 'different-key';
  assert.equal(hasInquiryAccess(token, now), false);
});
