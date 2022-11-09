/**
 * 针对一些特殊文件进行单独处理
 */
import traverse from '@babel/traverse'
import generator from '@babel/generator'
import t from '@babel/types'
import glob from 'glob'
import fs from 'fs'
import {
  createTFN,
  createAst,
  skipMixin,
  validateString,
  unshiftI18nModule,
} from './utils.mjs'
import { uiSrcDir } from './config.mjs'

function createTraverse(traverseOptions) {
  return (code) => {
    let ast = createAst(code)
    let templateString = []
    traverse.default(ast, {
      ...skipMixin,
      ...traverseOptions,
    })
    unshiftI18nModule(ast)
    const output = generator.default(ast)
    return { output, isTransform: true, templateString }
  }
}

function arrayObjKeyTransform(p, options) {
  const objName = p.node.id.name
  const includeObjs = options.filter((o) => o.objName === objName)
  if (includeObjs.length) {
    function loop(init) {
      if (init.properties?.length) {
        init.properties.forEach((pr) => {
          loop(pr.value)
        })
      }
      if (init.elements?.length) {
        init.elements.forEach((ele) => {
          ele.properties.forEach((prop) => {
            if (
              includeObjs.filter((i) => i.keys.includes(prop.key.name)).length
            ) {
              const str = prop.value.value
              if (t.isStringLiteral(prop.value) && validateString(str)) {
                prop.value = createTFN(prop.value.value)
              }
              if (t.isArrayExpression(prop.value)) {
                // 针对 children 这种再做一次递归，例如手风琴菜单
                loop(prop.value)
              }
            }
          })
        })
      }
    }
    loop(p.node.init)
  }
}

const files = [
  {
    path: 'screens/Console/Configurations/utils.tsx',
    traverse: createTraverse({
      VariableDeclarator(p) {
        arrayObjKeyTransform(p, [
          {
            objName: 'configurationElements',
            keys: ['configuration_label'],
          },
          {
            objName: 'fieldsConfigurations',
            keys: ['label', 'tooltip', 'placeholder'],
          },
        ])
      },
    }),
  },
  {
    path: 'screens/Console/valid-routes.ts',
    traverse: createTraverse({
      VariableDeclarator(p) {
        arrayObjKeyTransform(p, [
          {
            objName: 'consoleMenus',
            keys: ['name', 'children', 'group'],
          },
          {
            objName: 'operatorMenus',
            keys: ['name'],
          },
          {
            objName: 'directPVMenus',
            keys: ['name'],
          },
        ])
      },
    }),
  },
]

files.forEach((item) => {
  glob(`${uiSrcDir}${item.path}`, (err, files) => {
    console.log('=============== 添加国际化方法开始 START =============')
    const ignorePath = ['screens/Console/Common/IconsScreen']
    let editTotal = 0
    files.forEach((filePath) => {
      if (ignorePath.map((f) => filePath.includes(f)).filter((i) => i).length) {
        return
      }
      console.log('File: ', filePath)
      const code = fs.readFileSync(filePath).toString('utf-8')
      const { output, isTransform, templateString } = item.traverse(code)
      if (isTransform) {
        editTotal += 1
        console.log('已修改 (Modified)')
        fs.writeFileSync(filePath, output.code)
      } else {
        console.log('无需修改 (Unmodified)')
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
})
