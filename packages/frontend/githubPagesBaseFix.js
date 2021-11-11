const fs = require('fs')
const path = require('path')

const indexPath = path.resolve(__dirname, './dist/index.html')
const contents = fs.readFileSync(indexPath, 'utf-8')
const replaced = contents.replace('<head>','<head>\n<base href="/polyratings-revamp/">')

fs.writeFileSync(indexPath, replaced)