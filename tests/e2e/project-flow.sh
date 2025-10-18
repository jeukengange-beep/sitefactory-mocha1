#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

DB_NAME="$(node -e "const cfg = require('./wrangler.json'); console.log(cfg?.d1_databases?.[0]?.database_name || '')")"
if [[ -z "$DB_NAME" ]]; then
  echo "Unable to determine D1 database name from wrangler.json" >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:8787}"

echo "Resetting database..."
wrangler d1 execute "$DB_NAME" --command "DELETE FROM projects;"

echo "Creating project..."
CREATE_RESPONSE="$(curl -sSf -X POST "$BASE_URL/api/projects" \
  -H 'Content-Type: application/json' \
  -d '{"siteType":"personal","language":"fr"}')"

read -r PROJECT_ID PROJECT_SLUG <<EOF_PARSE
$(printf '%s' "$CREATE_RESPONSE" | node - <<'NODE'
const fs = require('fs');
try {
  const input = fs.readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  if (!data.id || !data.slug) {
    console.error('Create response missing id/slug');
    process.exit(1);
  }
  process.stdout.write(`${data.id} ${data.slug}`);
} catch (error) {
  console.error('Failed to parse project creation response', error);
  process.exit(1);
}
NODE
)
EOF_PARSE

echo "Created project #$PROJECT_ID with slug $PROJECT_SLUG"

STEP2_PAYLOAD='{
  "deepAnswers": "Je suis designer freelance et j\"accompagne les startups dans la création de leurs identités visuelles.",
  "structuredProfile": {
    "siteName": "Studio Nova",
    "tagline": "Identités visuelles audacieuses",
    "description": "Je crée des marques modernes et mémorables pour les startups ambitieuses.",
    "tone": "moderne",
    "ambience": "élégant et minimaliste",
    "primaryGoal": "Présenter mon portfolio et attirer de nouveaux clients",
    "keyHighlights": ["Expertise branding", "Approche collaborative", "Design sur mesure"],
    "recommendedCTA": "Réserver un appel",
    "colors": ["#1F2937", "#F59E0B", "#10B981"],
    "sections": [
      {"id": "hero", "title": "Accueil"},
      {"id": "work", "title": "Réalisations"}
    ],
    "lang": "fr"
  }
}'

STEP3_PAYLOAD='{
  "selectedInspirations": [
    {"id": "insp-1", "title": "Inspiration 1", "domain": "inspiration.one", "image": "https://example.com/1.jpg", "justification": "Design inspirant"}
  ]
}'

STEP4_PAYLOAD='{
  "generatedImages": [
    {"id": "overview", "type": "overview", "url": "https://example.com/overview.jpg", "filename": "overview.jpg"}
  ],
  "status": "completed"
}'

echo "Persisting questionnaire answers (step 2)..."
curl -sSf -X PATCH "$BASE_URL/api/projects/$PROJECT_ID" \
  -H 'Content-Type: application/json' \
  -d "$STEP2_PAYLOAD" >/dev/null

echo "Persisting inspirations (step 3)..."
curl -sSf -X PATCH "$BASE_URL/api/projects/$PROJECT_ID" \
  -H 'Content-Type: application/json' \
  -d "$STEP3_PAYLOAD" >/dev/null

echo "Persisting generated images (step 4)..."
curl -sSf -X PATCH "$BASE_URL/api/projects/$PROJECT_ID" \
  -H 'Content-Type: application/json' \
  -d "$STEP4_PAYLOAD" >/dev/null

echo "Fetching project by slug..."
PROJECT_RESPONSE="$(curl -sSf "$BASE_URL/api/projects/$PROJECT_SLUG")"

printf '%s' "$PROJECT_RESPONSE" | node - <<'NODE'
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8');
const data = JSON.parse(input);

if (data.status !== 'completed') {
  console.error('Expected project to be completed, got', data.status);
  process.exit(1);
}

if (!data.structuredProfile || data.structuredProfile.siteName !== 'Studio Nova') {
  console.error('Structured profile missing or incorrect', data.structuredProfile);
  process.exit(1);
}

if (!Array.isArray(data.generatedImages) || data.generatedImages.length === 0) {
  console.error('Generated images missing from project');
  process.exit(1);
}

console.log('Project flow verified successfully.');
NODE
