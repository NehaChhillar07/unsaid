#!/usr/bin/env bash
# unsaid backend verification — run against a local `supabase start` stack.
#
# Required env vars:
#   SUPABASE_URL        (default http://127.0.0.1:54321)
#   SUPABASE_ANON_KEY   anon key from `supabase status`
#   USER_JWT            access_token of a signed-in user that has a profile
#                       + identities (e.g. demo-review@unsaid.app — sign in
#                       via password grant, see bottom of this file)
#   DB_URL              (default postgresql://postgres:postgres@127.0.0.1:54322/postgres)
#
# Note: the harassment fixture only blocks when OPENAI_API_KEY is set for the
# functions runtime (supabase functions serve --env-file). Without it the
# moderation layer passes and logs rule_hits=['no-moderation-key'].

set -uo pipefail

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
FN="$SUPABASE_URL/functions/v1"

: "${SUPABASE_ANON_KEY:?set SUPABASE_ANON_KEY (from supabase status)}"
: "${USER_JWT:?set USER_JWT (access token of a signed-in user)}"

PASS=0
FAIL=0

call() { # call <function> <json-body>
  curl -s -X POST "$FN/$1" \
    -H "Authorization: Bearer $USER_JWT" \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "$2"
}

check() { # check <name> <expected-grep> <actual>
  local name="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo "PASS  $name"
    PASS=$((PASS + 1))
  else
    echo "FAIL  $name"
    echo "      expected to match: $expected"
    echo "      got: $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo "── publish: rule layer ─────────────────────────────────────────"

# 1. clean post publishes
R=$(call publish '{"kind":"post","mode":"personal","body":"i finally told someone how tired i actually am. it felt like putting down a bag i forgot i was carrying.","mood":"relieved"}')
check "clean post publishes" '"verdict":"published"' "$R"

# 2. crisis EXPRESSION → verdict crisis (client shows CrisisSheet)
R=$(call publish '{"kind":"post","mode":"personal","body":"some days i just don'"'"'t want to be here anymore.","mood":"heavy"}')
check "crisis expression returns crisis verdict" '"verdict":"crisis"' "$R"

# 3. crisis re-submit WITH acknowledged_crisis → publishes
R=$(call publish '{"kind":"post","mode":"personal","body":"some days i just don'"'"'t want to be here anymore.","mood":"heavy","acknowledged_crisis":true}')
check "acknowledged crisis publishes" '"verdict":"published"' "$R"

# 4. crisis METHOD/INTENT → hard block even with acknowledgement
R=$(call publish '{"kind":"post","mode":"personal","body":"i keep searching how to overdose and i think tonight i will end it","acknowledged_crisis":true}')
check "crisis method hard-blocks" '"verdict":"blocked"' "$R"
check "crisis method block has helpline copy" 'helpline' "$R"

# 5. de-anon fixture → blocked
R=$(call publish '{"kind":"post","mode":"professional","body":"my manager Rahul at Google in Gurgaon took credit for my work again today"}')
check "de-anon fixture blocked" '"verdict":"blocked"' "$R"
check "de-anon block has kind copy" 'not their name' "$R"

# 6. harassment fixture → blocked (requires OPENAI_API_KEY in functions env)
R=$(call publish '{"kind":"post","mode":"professional","body":"everyone should pile on this worthless idiot until they quit. they deserve to be hounded out and made to suffer."}')
check "harassment fixture blocked (needs OPENAI_API_KEY)" '"verdict":"blocked"' "$R"

echo ""
echo "── role-check ──────────────────────────────────────────────────"

# 7. overly specific role title flagged with prototype copy
R=$(call role-check '{"role_title":"VP of design at google, gurgaon"}')
check "role-check flags specific title" '"ok":false' "$R"
check "role-check returns prototype warning" 'point right at you' "$R"

# 8. broad role title passes
R=$(call role-check '{"role_title":"overthinker, 23"}')
check "role-check passes broad title" '"ok":true' "$R"

echo ""
echo "── react / report / mute smoke ─────────────────────────────────"

SEED_POST="b0000000-0000-4000-8000-000000000001"

R=$(call react "{\"post_id\":\"$SEED_POST\",\"type\":\"felt\"}")
check "react toggles on" '"active":true' "$R"
R=$(call react "{\"post_id\":\"$SEED_POST\",\"type\":\"felt\"}")
check "react toggles off" '"active":false' "$R"

R=$(call report "{\"target_type\":\"post\",\"target_id\":\"$SEED_POST\",\"reason\":\"spam\"}")
check "report accepted" '"ok":true' "$R"

R=$(call mute "{\"target_type\":\"post\",\"target_id\":\"$SEED_POST\"}")
check "mute accepted" '"ok":true' "$R"
if echo "$R" | grep -q "author_id"; then
  echo "FAIL  mute response leaked author_id: $R"
  FAIL=$((FAIL + 1))
else
  echo "PASS  mute never returns an author id"
  PASS=$((PASS + 1))
fi

echo ""
echo "── anonymity: views must never expose author_id ────────────────"

# psql assertion: expect ZERO rows. Inverted grep — finding 'author_id' = FAIL.
COLS=$(psql "$DB_URL" -t -A -c \
  "select view_name || '.' || column_name
     from information_schema.columns c
     join information_schema.views v
       on v.table_schema = c.table_schema and v.table_name = c.table_name
    where c.table_schema = 'public'
      and c.table_name in ('feed_posts', 'post_comments', 'saved_posts')" \
  2>/dev/null)

if [ -z "$COLS" ]; then
  echo "SKIP  view column check (psql/DB_URL unavailable)"
elif echo "$COLS" | grep -q "author_id"; then
  echo "FAIL  a public view exposes author_id:"
  echo "$COLS" | grep "author_id"
  FAIL=$((FAIL + 1))
else
  echo "PASS  feed_posts / post_comments / saved_posts never expose author_id"
  PASS=$((PASS + 1))
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1

# ─────────────────────────────────────────────────────────────────────
# Getting a USER_JWT for the demo review account (password auth):
#
#   curl -s "$SUPABASE_URL/auth/v1/token?grant_type=password" \
#     -H "apikey: $SUPABASE_ANON_KEY" \
#     -H "Content-Type: application/json" \
#     -d '{"email":"demo-review@unsaid.app","password":"UnsaidReview2026!"}' \
#     | jq -r .access_token
# ─────────────────────────────────────────────────────────────────────
