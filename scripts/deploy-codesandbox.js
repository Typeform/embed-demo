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

const removeUnusedFiles = (dir) => {
  const files = [
    'package.json',
    'node_modules',
    'README.md',
    'CHANGELOG.md',
    'yarn.lock',
    '.next',
    'public/lib',
  ]
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

const buildDemoNext = async (dir) => {
  const pagesDir = path.join(dir, 'pages')
  const pagesToIgnore = ['_app.js', 'vanilla.js']

  const demoNames = []

  fs.readdirSync(pagesDir)
    .filter((page) => !pagesToIgnore.includes(page))
    .forEach((filename) => {
      const overwrittenFilename =
        filename === 'index.js' ? 'widget.js' : filename
      const dirName = path.parse(overwrittenFilename).name
      const finalDir = path.join(dir, dirName)

      demoNames.push(dirName)

      fse.ensureDirSync(finalDir)
      fse.copySync(
        path.join(dir, 'components'),
        path.join(finalDir, 'components')
      )
      fse.copySync(
        path.join(dir, 'pages', filename),
        path.join(finalDir, 'pages', 'index.js')
      )
      fse.copySync(path.join(dir, 'styles'), path.join(finalDir, 'styles'))

      const json = {
        name: `${dirName}-nextjs`,
        license: 'MIT',
        description: `Embed SDK Demo - ${dirName} NextJS`,
        version: '1.0.0',
        scripts: {
          dev: 'next',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          '@typeform/embed': '^4.3.2',
          '@typeform/embed-react': '^3.8.0',
          'next': '14.0.4',
          'prop-types': '^15.8.1',
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
        },
      }

      fse.writeJsonSync(path.join(finalDir, 'package.json'), json)
    })

  const filesGlob = './**/index.js'

  await replaceInFiles({
    files: filesGlob,
    from: '{ id }',
    to: `{ id = 'moe6aa' }`,
  })

  fse.removeSync(path.join(dir, 'components'))
  fse.removeSync(path.join(dir, 'pages'))
  fse.removeSync(path.join(dir, 'styles'))
  fse.removeSync(path.join(dir, 'public'))

  return demoNames
}

const writeReadmeFile = (demoHtmlNames, demoNextNames) => {
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

${demoNextNames
  .map(
    (name, index) =>
      `${
        index + 1
      }. [${name}](https://codesandbox.io/s/github/Typeform/embed-demo/tree/main/${demoNextDirName}/${name})`
  )
  .join('\n')}

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

  removeUnusedFiles(destDemoHtmlDir)
  removeUnusedFiles(destDemoNextDir)

  const demoHtmlNames = await buildDemoHtml(destDemoHtmlPublicDir)

  const demoNextNames = await buildDemoNext(destDemoNextDir)

  writeReadmeFile(demoHtmlNames, demoNextNames)
}

main()
