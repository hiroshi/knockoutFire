HOUSEKEEPING
============

Release a new version
---------------------

e.g. we will release version 0.0.5.

### Update CHANGELOG.md

Consult with `git log 0.0.4...HEAD` for CHANGELOG.md to confirm no significant changes missing in CHANGELOG.md.

### Check if version numbers are consistent in all files

- component.json
- package.json
- knockoutfire.js
- README.md
- CHANGELOG.md

### Create a tag

    git tag 0.0.5

### Update GitHub Pages as a CDN

    git checkout gh-pages
    git checkout 0.0.5 -- knockoutfire.js
    cp knockoutfire.js knockoutfire-0.0.5.js
    git add knockoutfire-0.0.5.js

### Ready? Push them all

    git checkout gh-pages
    git push
    git checkout master
    git push
    git push --tags
