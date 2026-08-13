echo "publish $1"
push
npm run build
npm pack --dry-run
npm version $1
npm publish --access public
