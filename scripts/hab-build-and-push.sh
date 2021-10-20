#!/bin/bash

export BASE_ASSETS_PATH=$1
export SHORTLINK_DOMAIN=$2
export RETICULUM_SERVER=$3
export THUMBNAIL_SERVER=$4
export TERRA_SERVER=$5
export CORS_PROXY_SERVER=$6
export NON_CORS_PROXY_DOMAINS=$7
export TARGET_S3_BUCKET=$8
export SENTRY_DSN=$9
export GA_TRACKING_ID=${10}
export MIXPANEL_TOKEN=${11}
export BUILD_NUMBER=${12}
export GIT_COMMIT=${13}
export BUILD_VERSION="${BUILD_NUMBER} (${GIT_COMMIT})"
export HAB_BLDR_URL="https://bldr.biome.sh"

# Build the package, upload it, and start the service so we deploy to staging target.

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
source "$DIR/../habitat/plan.sh"
PKG="$pkg_origin/$pkg_name"

pushd "$DIR/.."

trap "rm /hab/svc/$pkg_name/var/deploying && sudo /usr/bin/hab-clean-perms && chmod -R a+rw ." EXIT

# Wait for a lock file so we serialize deploys
mkdir -p /hab/svc/$pkg_name/var
while [ -f /hab/svc/$pkg_name/var/deploying ]; do sleep 1; done
touch /hab/svc/$pkg_name/var/deploying

rm -rf results
mkdir -p results
cp -R ~/.ssh ./dotssh # Copy github.com credentials becuase of shared-aframe private repo dep
cp -R ~/.aws ./dotaws # Copy AWS credentials
sudo /usr/bin/hab-docker-studio run build
hab svc unload $PKG
sudo /usr/bin/hab-pkg-install results/*.hart
hab svc load $PKG
hab svc stop $PKG

# Apparently these vars come in from jenkins with quotes already
cat > build-config.toml << EOTOML
[general]
base_assets_path = $BASE_ASSETS_PATH
shortlink_domain = $SHORTLINK_DOMAIN
terra_server = $TERRA_SERVER
reticulum_server = $RETICULUM_SERVER
thumbnail_server = $THUMBNAIL_SERVER
cors_proxy_server = $CORS_PROXY_SERVER
non_cors_proxy_domains = $NON_CORS_PROXY_DOMAINS
sentry_dsn = $SENTRY_DSN
ga_tracking_id = $GA_TRACKING_ID
mixpanel_token = $MIXPANEL_TOKEN

[deploy]
type = "s3"
target = $TARGET_S3_BUCKET
region = "us-west-1"
EOTOML

cat build-config.toml
sudo /usr/bin/hab-user-toml-install $pkg_name build-config.toml
echo "Starting $PKG"
hab svc unload $PKG
sleep 3
hab svc load $PKG
echo "Started $PKG"
#sudo /usr/bin/hab-pkg-upload results/*.hart
