const process = require('process')
const fs = require('fs')
const path = require('path')

const fse = require('fs-extra')
const replaceInFiles = require('replace-in-files')

const thisRepoRootDir = path.resolve(__dirname, '..')
const embedRepoPackagesDir = path.resolve(
  __dirname,
  '..',
  '..',
  'embed',
  'packages'
)

const demoHtmlDirName = 'demo-html'
const demoNextDirName = 'demo-nextjs'

const originDemoHtmlDir = path.resolve(embedRepoPackagesDir, demoHtmlDirName)
const destDemoHtmlDir = path.resolve(thisRepoRootDir, demoHtmlDirName)
const destDemoHtmlPublicDir = path.join(destDemoHtmlDir, 'public')
const originDemoNextDir = path.resolve(embedRepoPackagesDir, demoNextDirName)
const destDemoNextDir = path.resolve(thisRepoRootDir, demoNextDirName)

const readmeFilePath = path.resolve(thisRepoRootDir, 'README.md')

const removeUnusedFilesHtml = (dir) => {
  const files = ['package.json', 'README.md', 'CHANGELOG.md', 'public/lib']
  files.forEach((file) => fse.removeSync(path.join(dir, file)))
}

const removeUnusedFilesNextJs = (dir) => {
  const files = ['node_modules', 'README.md', 'CHANGELOG.md', '.next', 'public']
  files.forEach((file) => fse.removeSync(path.join(dir, file)))
}

const buildDemoHtml = async (dir) => {
  fs.readdirSync(dir)
    .filter((file) => fs.statSync(path.join(dir, file)).isDirectory())
    .forEach((dirName) => {
      const innerDir = path.join(dir, dirName)
      fse.copySync(innerDir, dir)
      fse.removeSync(innerDir)
    })

  const newDir = path.resolve(dir, '..')
  fse.copySync(dir, newDir)
  fse.removeSync(dir)

  const filesGlob = './**/*.html'

  await replaceInFiles({
    files: filesGlob,
    from: /\.+\/lib\/embed\.js/g,
    to: '//embed.typeform.com/next/embed.js',
  })

  await replaceInFiles({
    files: filesGlob,
    from: /\.+\/lib\/css\//g,
    to: '//embed.typeform.com/next/css/',
  })

  const demoNames = []

  fs.readdirSync(newDir).forEach((fileName) => {
    const dirName = path.parse(fileName).name
    const finalDir = path.join(newDir, dirName)
    const oldDir = path.join(newDir, fileName)
    const fileFinalDir = path.join(newDir, dirName, fileName)

    demoNames.push(dirName)

    fse.ensureDirSync(finalDir)
    fse.moveSync(oldDir, fileFinalDir)
    fs.renameSync(fileFinalDir, path.join(finalDir, 'index.html'))

    const json = {
      name: dirName,
      license: 'MIT',
      description: `Embed SDK Demo - ${dirName}`,
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

    fse.writeJsonSync(path.join(finalDir, 'package.json'), json)
  })

  return demoNames
}

const writeReadmeFile = (demoHtmlNames) => {
  fse.removeSync(readmeFilePath)

  fs.writeFileSync(
    readmeFilePath,
    `# CodeSandbox demos

Demos for [@typeform/embed](https://github.com/Typeform/embed).

## HTML

${demoHtmlNames
  .map(
    (name, index) =>
      `${
        index + 1
      }. [${name}](https://codesandbox.io/s/github/Typeform/embed-demo/tree/main/${demoHtmlDirName}/${name})`
  )
  .join('\n')}

## React (NextJS)

[React app](https://codesandbox.io/s/github/Typeform/embed-demo/tree/main/demo-nextjs)

## Dev notes

Do not edit this README file or any of the \`demo-\` directories manually. They are generated automatically by [github action](https://github.com/Typeform/embed-demo/blob/main/.github/workflows/update-demos.yml) using [\`yarn deploy\` script](https://github.com/Typeform/embed-demo/blob/main/scripts/deploy-codesandbox.js).
`
  )
}

async function main() {
  fse.removeSync(destDemoHtmlDir)
  fse.ensureDirSync(destDemoHtmlDir)

  fse.removeSync(destDemoNextDir)
  fse.ensureDirSync(destDemoNextDir)

  fse.copySync(originDemoHtmlDir, destDemoHtmlDir)
  fse.copySync(originDemoNextDir, destDemoNextDir)

  process.chdir(thisRepoRootDir)

  removeUnusedFilesHtml(destDemoHtmlDir)
  removeUnusedFilesNextJs(destDemoNextDir)

  const demoHtmlNames = await buildDemoHtml(destDemoHtmlPublicDir)

  writeReadmeFile(demoHtmlNames)
}

main()
