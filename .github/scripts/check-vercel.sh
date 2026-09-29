#!/usr/bin/env bash
# Fails fast, with an actionable message, when the Vercel secrets are missing or
# do not give access to the project. Expects VERCEL_TOKEN, VERCEL_ORG_ID and
# VERCEL_PROJECT_ID in the environment.
set -u

missing=0
for name in VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID; do
  if [ -z "${!name:-}" ]; then
    echo "::error title=Missing secret::$name is not set. Add it under Settings -> Secrets and variables -> Actions."
    missing=1
  fi
done
[ "$missing" -eq 0 ] || exit 1

# Call the same endpoints `vercel pull` uses, with the same token, and report each
# result. A token can pass one and be refused on another.
api() { # $1 = label, $2 = path
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com$2")
  echo "  $1: HTTP $code"
  echo "$code" > "/tmp/vercel-check-$1"
}

echo "Checking Vercel access for team $VERCEL_ORG_ID / project $VERCEL_PROJECT_ID"
api team "/teams/$VERCEL_ORG_ID?teamId=$VERCEL_ORG_ID"
api project "/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID"
api env-pull "/v3/env/pull/$VERCEL_PROJECT_ID/production?source=vercel-cli%3Apull&teamId=$VERCEL_ORG_ID"
api env-list "/v10/projects/$VERCEL_PROJECT_ID/env?target=production&source=vercel-cli%3Apull&teamId=$VERCEL_ORG_ID"

failed=0
for label in team project env-pull env-list; do
  code=$(cat "/tmp/vercel-check-$label")
  if [ "$code" != "200" ]; then
    echo "::error title=Vercel access check failed ($label)::GET for '$label' returned HTTP $code. 401 = invalid or expired VERCEL_TOKEN; 403 = the token cannot access this team or project (recreate it with Scope = the team); 404 = VERCEL_ORG_ID / VERCEL_PROJECT_ID do not match .vercel/project.json."
    failed=1
  fi
done
[ "$failed" -eq 0 ] && echo "Vercel token can reach the team, project and environment variables."
exit "$failed"
