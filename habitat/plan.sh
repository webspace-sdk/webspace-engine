pkg_name=jel
pkg_origin=jel
pkg_maintainer="Greg Fodor <gfodor@jel.app>"

pkg_version="1.0.0"
pkg_license=('None')
pkg_description="Collaboration made fun"
pkg_upstream_url="https://jel.app/"
pkg_build_deps=(
    core/coreutils
    core/bash
    core/node10/10.16.2 # Latest node10 fails during npm ci due to a permissions error creating tmp dir
    core/git
)

pkg_deps=(
    core/aws-cli # AWS cli used for run hook when uploading to S3
)

do_build() {
  ln -fs "$(bio pkg path core/coreutils)/bin/env" /usr/bin/env

  [ -d "./dotssh" ] && rm -rf ~/.ssh && mv dotssh ~/.ssh
  [ -d "./dotaws" ] && rm -rf ~/.aws && mv dotaws ~/.aws

  # main client
  npm_config_cache=.npm npm ci --verbose --no-progress

  # We inject a random token into the build for the base assets path
  export BASE_ASSETS_PATH="$(echo "base_assets_path" | sha256sum | cut -d' ' -f1)/" # HACK need a trailing slash so webpack'ed semantics line up
  export BUILD_VERSION="${pkg_version}.$(echo $pkg_prefix | cut -d '/' -f 7)"

  npm_config_cache=.npm npm run build

  # admin
  # cd admin
  # npm_config_cache=.npm npm ci --verbose --no-progress

  # npm_config_cache=.npm npm run build
  # cp -R dist/* ../dist # it will get packaged with the rest of the stuff, below
  # cd ..

  mkdir -p dist/pages
  mv dist/*.html dist/pages
  mv dist/jel.service.js dist/pages
  mv dist/schema.toml dist/pages
}

do_install() {
  cp -R dist "${pkg_prefix}"
}
