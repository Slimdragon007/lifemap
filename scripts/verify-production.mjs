const appOrigin = process.env.LIFEMAP_APP_ORIGIN ?? "https://lifemap-d33.pages.dev";
const apiOrigin =
  process.env.LIFEMAP_API_ORIGIN ?? "https://lifemap-api.m-haslim.workers.dev";

const sampleIntake =
  "School portal note: Casey needs a signed field trip form by Friday. Missing parent signature and emergency contact. Email it to Ms. Rivera.";

const checks = [];

async function main() {
  const appHtml = await checkPagesHtml();
  const bundleText = await checkClientBundle(appHtml);
  await checkWorkerHealth();
  await checkCorsPreflight();
  await checkAnalyzeRoute();
  checkPublicAssetSecrets(`${appHtml}\n${bundleText}`);

  console.log("");
  console.log(`Production verification passed (${checks.length} checks).`);
  for (const check of checks) {
    console.log(`✓ ${check}`);
  }
}

async function checkPagesHtml() {
  const response = await fetch(`${appOrigin}/`);
  assert(response.ok, `Pages HTML returned ${response.status}`);

  const html = await response.text();
  assert(html.includes("<title>LifeMap</title>"), "Pages HTML is not LifeMap");
  checks.push(`Pages HTML responds at ${appOrigin}`);
  return html;
}

async function checkClientBundle(html) {
  const scriptMatch = html.match(/<script[^>]+src="([^"]+\.js)"/);
  assert(scriptMatch, "Could not find the deployed JavaScript bundle");

  const bundleUrl = new URL(scriptMatch[1], appOrigin).toString();
  const response = await fetch(bundleUrl);
  assert(response.ok, `Client bundle returned ${response.status}`);

  const bundleText = await response.text();
  assert(
    bundleText.includes(apiOrigin),
    "Client bundle does not include the production Worker origin",
  );
  checks.push(`Client bundle points to ${apiOrigin}`);
  return bundleText;
}

async function checkWorkerHealth() {
  const response = await fetch(`${apiOrigin}/health`, {
    headers: { Origin: appOrigin },
  });
  assert(response.ok, `Worker health returned ${response.status}`);

  const body = await response.json();
  assert(body?.ok === true, "Worker health did not return ok: true");
  checks.push("Worker health route is live");
}

async function checkCorsPreflight() {
  const response = await fetch(`${apiOrigin}/api/analyze`, {
    method: "OPTIONS",
    headers: {
      Origin: appOrigin,
      "Access-Control-Request-Method": "POST",
    },
  });

  assert(response.status === 204, `CORS preflight returned ${response.status}`);
  assert(
    response.headers.get("access-control-allow-origin") === appOrigin,
    "CORS does not allow the production Pages origin",
  );
  checks.push("Worker CORS allows the production Pages origin");
}

async function checkAnalyzeRoute() {
  const response = await fetch(`${apiOrigin}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: appOrigin,
    },
    body: JSON.stringify({ rawIntake: sampleIntake }),
  });

  assert(response.ok, `Analyze route returned ${response.status}`);
  const body = await response.json();
  assert(body?.ok === true, body?.error ?? "Analyze route did not return ok: true");
  assert(
    Array.isArray(body.analysis?.nextActions) &&
      body.analysis.nextActions.length > 0,
    "Analyze route returned no next actions",
  );
  checks.push(
    `Analyze route returns structured output (${body.analysis.nextActions.length} next actions)`,
  );
}

function checkPublicAssetSecrets(text) {
  const forbiddenMarkers = [
    "OPENAI_API_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    /sk-[A-Za-z0-9_-]{20,}/,
  ];

  for (const marker of forbiddenMarkers) {
    const found =
      typeof marker === "string" ? text.includes(marker) : marker.test(text);
    assert(!found, `Public assets include forbidden marker ${marker.toString()}`);
  }

  checks.push("Public assets do not expose server-only secret markers");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error("Production verification failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
