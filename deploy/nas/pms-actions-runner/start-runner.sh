#!/usr/bin/env bash
set -euo pipefail

token_file=/runner-setup/runner-token

if [[ ! -x ./config.sh ]]; then
  cp -R /opt/actions-runner-base/. .
fi

if [[ ! -f .runner ]]; then
  until [[ -s "${token_file}" ]]; do
    echo "Waiting for the one-time GitHub runner registration token"
    sleep 5
  done

  runner_token="$(<"${token_file}")"
  ./config.sh \
    --url "${RUNNER_URL}" \
    --token "${runner_token}" \
    --name "${RUNNER_NAME}" \
    --labels "${RUNNER_LABELS}" \
    --no-default-labels \
    --work _work \
    --unattended \
    --replace

  rm -f "${token_file}"
fi

exec ./run.sh
