#!/bin/sh
# Checks whether a server can subscribe an email to the BrainByte Substack
# directly (what netlify/functions/guide-verify.mjs does after a correct code).
#   TEST_EMAIL=you@example.com sh scripts/test-substack-subscribe.sh
# The address really gets subscribed; unsubscribe it on Substack afterwards.
[ -z "$TEST_EMAIL" ] && { echo "Set TEST_EMAIL first"; exit 1; }
curl -s -X POST "https://harisankarsivankutty.substack.com/api/v1/free" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36" \
  --data "{\"email\":\"$TEST_EMAIL\",\"first_url\":\"https://harisankarsivankutty.in/guides/\",\"current_url\":\"https://harisankarsivankutty.in/guides/\",\"source\":\"embed\"}" \
  -w "\nHTTP %{http_code}\n" | head -c 600
echo
