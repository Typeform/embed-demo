const { execSync } = require('child_process')
const process = require('process')
const fs = require('fs')
const path = require('path')

const fse = require('fs-extra')
const replaceInFiles = require('replace-in-files')

const exec = (cmd) => execSync(cmd, { stdio: 'inherit' })
const tmpDir = './.tmp'

async function main() {
  const tmpDemoDir = `${tmpDir}/demo-html`
  fse.removeSync(tmpDir)
  fse.ensureDirSync(tmpDir)
  fse.copySync('./../embed/packages/demo-html', tmpDemoDir)

  process.chdir(tmpDemoDir)

  fse.removeSync('./package.json')
  fse.removeSync('./node_modules')
  fse.removeSync('./public/lib')
  fse.copySync('./public/', './')
  fse.copySync('./behavioral-html/', './')
  fse.copySync('./behavioral-js/', './')
  fse.removeSync('./public')
  fse.removeSync('./behavioral-html')
  fse.removeSync('./behavioral-js')
  fse.removeSync('./behavioral-js')
  fse.removeSync('CHANGELOG.md')
  fse.removeSync('README.md')

  const filesPathPattern = './**/*.html'

  await replaceInFiles({
    files: filesPathPattern,
    from: /\.+\/lib\/embed-next\.js/,
    to: '//embed.typeform.com/next/embed.js',
  })

  await replaceInFiles({
    files: filesPathPattern,
    from: /\.+\/lib\/css\//,
    to: '//embed.typeform.com/next/css/',
  })

  const files = fs.readdirSync('./')

  files.forEach((fileName) => {
    const dirName = path.parse(fileName).name
    fse.ensureDirSync(dirName)
    fse.moveSync(`./${fileName}`, `./${dirName}/${fileName}`)
    fs.renameSync(`./${dirName}/${fileName}`, `./${dirName}/index.html`)
    const json = {
      name: dirName,
      version: '1.0.0',
      main: 'index.html',
      scripts: {
        start: 'parcel index.html --open',
        build: 'parcel build index.html',
      },
      dependencies: { 'parcel-bundler': '^1.6.1' },
      devDependencies: {
        '@babel/core': '7.2.0',
      },
      resolutions: {
        '@babel/preset-env': '7.13.8',
      },
    }
    fse.writeJsonSync(`./${dirName}/package.json`, json)
  })

  exec('git init')
  exec('git add .')
  exec('git commit -m codesandbox')
  exec(`git remote add origin git@github.com:scarciofolomarco/codesandbox-demo.git`)
  exec('git push origin master --force')
}

main()