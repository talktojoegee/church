#!/bin/bash
# EC2 first-boot script — paste into "User data" when launching the instance,
# or run manually after SSH login.
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y git curl ca-certificates

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu

# App directory
mkdir -p /opt/chms
chown ubuntu:ubuntu /opt/chms

echo "Docker ready. Clone repo as ubuntu user:"
echo "  git clone https://github.com/talktojoegee/church.git /opt/chms"
