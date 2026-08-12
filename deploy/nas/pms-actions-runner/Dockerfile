FROM ghcr.io/actions/actions-runner:2.336.0

USER root

ARG COMPOSE_VERSION=v5.3.1

RUN mkdir -p /usr/local/lib/docker/cli-plugins /opt/actions-runner-base \
    && cp -R /home/runner/. /opt/actions-runner-base/ \
    && curl -fsSL \
      "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
      -o /usr/local/lib/docker/cli-plugins/docker-compose \
    && chmod 755 /usr/local/lib/docker/cli-plugins/docker-compose

USER runner
