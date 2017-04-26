#!/bin/sh
set -e

installed_hook="$(git rev-parse --git-common-dir)/hooks/pre-commit"

if [ ! -f $installed_hook ]; then
    ln -s ../../scripts/pre-commit.sh $installed_hook
    echo
    echo "== Pre-commit hook installed. =="
fi

npm run test
./node_modules/.bin/flow
