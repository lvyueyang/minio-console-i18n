import glob from 'glob'
import fs from 'fs'
import { transformFile } from './transformFile.mjs'
import { target } from './config.mjs'

function main() {
  console.log('=============== 添加国际化方法开始 START =============')

  const templateFiles = []
  glob(target, (err, files) => {
    const ignorePath = ['screens/Console/Common/IconsScreen']
    let editTotal = 0
    files.forEach((filePath) => {
      if (ignorePath.map((f) => filePath.includes(f)).filter((i) => i).length) {
        return
      }

      const code = fs.readFileSync(filePath).toString('utf-8')
      const { output, isTransform, templateString } = transformFile(
        code,
        filePath
      )
      if (isTransform) {
        console.log('File: ', filePath)
        editTotal += 1
        console.log('已修改 (Modified)')
        fs.writeFileSync(filePath, output.code)
      } else {
        // console.log('File: ', filePath)
        // console.log('无需修改 (Unmodified)')
      }
      if (templateString.length) {
        templateFiles.push({
          filePath,
          pos: templateString,
        })
      }
    })
    console.log('文件总数 (Total Files):', files.length)
    console.log('已修改数 (Modified):', editTotal)
    console.log('未修改数 (Unmodified):', files.length - editTotal)
    console.log('=============== 添加国际化方法结束 END =============')
  })

  fs.writeFileSync(
    './template-string-log.json',
    JSON.stringify(templateFiles, null, 2)
  )
}

main()
