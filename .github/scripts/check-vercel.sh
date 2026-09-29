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

# Ask the API for the project with the same token the deploy steps will use
code=$(curl -s -o /dev/null -w '%{http_code}' \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v9/projects/$VERCEL_PROJECT_ID?teamId=$VERCEL_ORG_ID")

case "$code" in
  200)
    echo "Vercel token can access the project."
    ;;
  401)
    echo "::error title=Vercel token invalid::HTTP 401. VERCEL_TOKEN is wrong or expired. Create a new one at vercel.com/account/tokens and update the secret."
    exit 1
    ;;
  403)
    echo "::error title=Vercel token has no access::HTTP 403. Either VERCEL_TOKEN is invalid or expired, or it cannot see this team's project. The usual cause: it was created with Scope = 'Personal Account'. Recreate it at vercel.com/account/tokens with Scope set to the team that owns the project, then update the VERCEL_TOKEN secret."
    exit 1
    ;;
  404)
    echo "::error title=Vercel project not found::HTTP 404. Check that VERCEL_PROJECT_ID and VERCEL_ORG_ID match .vercel/project.json (npx vercel link) and that the token's scope includes that team."
    exit 1
    ;;
  *)
    echo "::error title=Vercel API check failed::Unexpected HTTP $code from api.vercel.com."
    exit 1
    ;;
esac
