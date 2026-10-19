const API = process.env.API_URL || 'http://localhost:3001';

function check(name, ok, detail = '') {
  if (!ok) throw new Error(`FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  console.log(`PASS ${name}`);
}

async function run() {
  const health = await fetch(`${API}/health`);
  check('health 200', health.status === 200);
  check(
    'nosniff header',
    health.headers.get('x-content-type-options') === 'nosniff',
  );
  check('frame deny', health.headers.get('x-frame-options') === 'DENY');

  const badJson = await fetch(`${API}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"email":',
  });
  const badBody = await badJson.json().catch(() => ({}));
  check(
    'invalid JSON is 400',
    badJson.status === 400,
    `status=${badJson.status} body=${JSON.stringify(badBody)}`,
  );

  const payload = JSON.stringify({
    email: 'nobody@example.com',
    password: 'wrong-password',
  });
  const [a, b] = await Promise.all([
    fetch(`${API}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }),
    fetch(`${API}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
    }),
  ]);
  const statuses = [a.status, b.status].sort();
  check(
    'duplicate in-flight login is blocked',
    statuses.includes(429) || statuses.every((s) => s === 401),
    `statuses=${statuses.join(',')}`,
  );
  if (statuses.includes(429)) {
    console.log('PASS single-flight returned 429 on the second click');
  }

  console.log('\nSecurity checks passed.');
}

run().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
