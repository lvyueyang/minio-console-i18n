import traverse from '@babel/traverse'
import generator from '@babel/generator'
import t from '@babel/types'

import {
  strZip,
  validateString,
  createTFN,
  createAst,
  skipMixin,
  unshiftI18nModule,
} from './utils.mjs'

const transformTempStr = (p, value) => {
  p.node.expressions = [createTFN(value)]
  const quasi = {
    ...p.node.quasis[0],
    value: {
      raw: '',
      cooked: '',
    },
  }
  p.node.quasis = [
    {
      ...quasi,
      tail: false,
    },
    {
      ...quasi,
      tail: true,
    },
  ]
}

/** 可以被国际化的组件属性 */
const ignoreCompAttr = [
  {
    name: 'FormLayout',
    attrs: ['title', 'helpbox'],
  },
  {
    name: 'HelpBox',
    attrs: ['title', 'help'],
  },
  {
    name: 'TooltipWrapper',
    attrs: ['tooltip'],
  },
  {
    name: 'InputBoxWrapper',
    attrs: ['overlayObject', 'error', 'tooltip'],
  },
  {
    name: 'ScreenTitle',
    attrs: ['subTitle', 'actions'],
  },
  {
    name: 'BrowserBreadcrumbs',
    attrs: ['additionalOptions'],
  },
  {
    name: 'TableWrapper',
    attrs: ['customEmptyMessage'],
  },
  {
    name: 'ActionsListSection',
    attrs: ['title'],
  },
  {
    name: 'ModalWrapper',
    attrs: ['title'],
  },
  {
    name: 'PageHeader',
    attrs: ['actions'],
  },
  {
    name: 'EditablePropertyItem',
    attrs: ['actions', 'property'],
  },
  {
    name: 'FormSwitchWrapper',
    attrs: ['description'],
  },
  {
    name: 'FeatureItem',
    attrs: ['description'],
  },
  {
    name: 'ConfirmDialog',
    attrs: ['title', 'confirmationContent'],
  },
  {
    name: 'ListItemText',
    attrs: ['primary'],
  },
  {
    name: 'SiteTypeHeader',
    attrs: ['title'],
  },
  {
    name: 'WarningMessage',
    attrs: ['title'],
  },
  {
    name: 'ConfirmDialog',
    attrs: ['confirmText', 'cancelText'],
  },
]

// 对 jsx 属性中的规则跳过判断
const isSkipJsxAttrRule = (p) => {
  /** 组件名称 */
  const compName = p.parent.name.name
  /** 组件属性 */
  const attrName = p.node.name.name
  const attrValue = p.node.value

  if (t.isJSXExpressionContainer && t.isJSXElement(attrValue?.expression)) {
    // 对属性值是 jsxElement 无需后续精确判断
    return false
  }
  const isInclude = ignoreCompAttr.some(
    (item) => item.name === compName && item.attrs.includes(attrName)
  )
  if (isInclude || ['placeholder', 'label'].includes(attrName)) {
    return false
  }
  return true
}

/** 对组件中的对象属性中的字符串做国际化, 像下面这种, 支持引用类型
  <SelectWrapper
    options={[{ label: "readonly", value: "readonly" }]}
  />
*/
const transformComponentAttr = [
  {
    name: 'SelectWrapper',
    attrs: ['options'],
    objectKeys: ['label'],
  },
  {
    name: 'RadioGroupSelector',
    attrs: ['selectorOptions'],
    objectKeys: ['label'],
  },
  {
    name: 'InputUnitMenu',
    attrs: ['unitsList'],
    objectKeys: ['label'],
  },
  {
    name: 'ActionsListSection',
    attrs: ['items'],
    objectKeys: ['label'],
  },
  {
    name: 'TableWrapper',
    attrs: ['columns'],
    objectKeys: ['label'],
  },
]

/** 添加国际化 */
export function transformFile(code) {
  let isTransform = false
  let templateString = []
  let ast = createAst(code)
  traverse.default(ast, {
    ...skipMixin,

    CallExpression(p) {
      const fnName = p.node.callee.name

      if (t.isMemberExpression(p.node.callee)) {
        if (
          p.node.callee.object.name === 'api' &&
          p.node.callee.property.name === 'invoke'
        ) {
          p.skip()
        }
      }

      // 对 permissionTooltipHelper 方法的第二个参数进行国际化
      if (fnName === 'permissionTooltipHelper') {
        const args = p.node.arguments
        const strArg = args[1] || {}
        if (strArg.type === 'StringLiteral' && validateString(strArg.value)) {
          p.replaceWith(
            t.callExpression(
              p.node.callee,
              args.map((arg, index) => {
                if (index === 1) {
                  isTransform = true
                  return createTFN(arg.value)
                }
                return arg
              })
            )
          )
          return
        }
      }
    },
    JSXAttribute(p) {
      if (isSkipJsxAttrRule(p)) {
        p.skip()
      } else {
        const attr = p.node.name.name
        const value = p.node.value?.value

        if (validateString(value) && p.node.value.type === 'StringLiteral') {
          p.replaceWith(
            t.JSXAttribute(
              p.node.name,
              t.jsxExpressionContainer(t.stringLiteral(strZip(value)))
            )
          )
          isTransform = true
        }
        return
      }
    },
    JSXText(p) {
      const { node } = p
      const { value } = node
      if (validateString(value)) {
        p.replaceWith(t.jsxExpressionContainer(t.stringLiteral(strZip(value))))
        isTransform = true
        return
      }
      p.skip()
    },
    JSXElement(p) {
      const { openingElement } = p.node
      const compName = openingElement?.name?.name
      // tabConfig: {
      //   label: t("Events"), // 这里进行国际化
      //   value: "events",
      //   component: Link,
      //   disabled: !hasPermission(bucketName, [
      //     IAM_SCOPES.S3_GET_BUCKET_NOTIFICATIONS,
      //     IAM_SCOPES.S3_PUT_BUCKET_NOTIFICATIONS,
      //   ]),
      //   to: getRoutePath("events"),
      // },
      // 对 VerticalTabs 的 tabConfig 中的 label 进行国际化
      if (compName === 'VerticalTabs') {
        p.node.children.map((c) => {
          if (
            t.isJSXExpressionContainer(c) &&
            t.isObjectExpression(c.expression)
          ) {
            c.expression.properties = c.expression.properties.map((p) => {
              if (t.isObjectProperty(p) && p.key.name === 'tabConfig') {
                p.value.properties = p.value.properties.map((item) => {
                  if (
                    item.key.name === 'label' &&
                    t.isStringLiteral(item.value)
                  ) {
                    const str = item.value.value
                    if (validateString(str)) {
                      isTransform = true
                      item.value = createTFN(item.value.value)
                    }
                  }
                  return item
                })
              }
              return p
            })
          }
          return c
        })

        p.replaceWith(p)
      }

      if (transformComponentAttr.map((i) => i.name).includes(compName)) {
        let isTran = false
        p.node.openingElement.attributes.forEach((attr) => {
          const includeCompAttr = transformComponentAttr.filter(
            (i) => i.name === compName && i.attrs.includes(attr.name.name)
          )

          if (includeCompAttr.length) {
            // 针对数组
            // <SelectWrapper
            //   options={[{ label: "readonly", value: "readonly" }]}
            // />
            // 针对直接使用数组变量形式做出国际化
            if (t.isArrayExpression(attr.value.expression)) {
              attr.value.expression.elements.forEach((ele) => {
                ele.properties?.forEach((prop) => {
                  const includeKey = includeCompAttr.filter((i) =>
                    i.objectKeys.includes(prop?.key?.name)
                  )

                  if (includeKey?.length && t.isStringLiteral(prop?.value)) {
                    prop.value = createTFN(prop.value.value)
                    isTran = true
                  }
                })
              })
            }
            // 针对引用类型取作用域，然后改变
            // const accessOptions = [{ label: "readonly", value: "readonly" }]
            // <SelectWrapper
            //   options={accessOptions}
            // />
            if (t.isIdentifier(attr.value.expression)) {
              const isIdentifierName = attr.value.expression.name
              const valuePath = p.scope.getBinding(isIdentifierName).path
              const valueNode = valuePath.node
              let scopeIsTran = false
              if (t.isVariableDeclarator(valueNode)) {
                valueNode.init.elements?.forEach((ele) => {
                  ele.properties?.forEach((prop) => {
                    const includeKey = includeCompAttr.filter((i) =>
                      i.objectKeys.includes(prop?.key?.name)
                    )
                    if (includeKey.length && t.isStringLiteral(prop?.value)) {
                      prop.value = createTFN(prop.value.value)
                      scopeIsTran = true
                    }
                  })
                })
              }
              if (scopeIsTran) {
                valuePath.replaceWith(valuePath)
                isTransform = true
              }
            }
          }
        })
        if (isTran) {
          p.replaceWith(p)
          isTransform = true
        }
      }
    },
    StringLiteral(p) {
      const { node, parent } = p
      const { value } = node
      if (validateString(value)) {
        if (
          t.isJSXExpressionContainer(parent) ||
          t.isConditionalExpression(parent)
        ) {
          // console.log(`[${value}] -> `, node)
          p.replaceWithSourceString(`t("${strZip(value)}")`)
          isTransform = true
          return
        }
      }

      p.skip()
    },
    TemplateLiteral(p) {
      // 模板字符串需要自己手动处理，因为各个语言下语境不同，拼接不同

      // 对于无参数的模板字符串进行国际化
      if (!p.node.expressions.length && !t.isCallExpression(p.parent)) {
        const raw = p.node.quasis[0].value.raw
        if (validateString(raw)) {
          if (
            t.isJSXExpressionContainer(p.parent) ||
            t.isConditionalExpression(p.parent)
          ) {
            transformTempStr(p, raw)
            isTransform = true
            return
          }
        }
      } else {
        templateString.push({
          pos: p.node.loc?.start,
        })
      }
    },
  })
  if (isTransform) {
    unshiftI18nModule(ast)
  }
  const output = generator.default(ast, {
    retainLines: true,
  })
  return { output, isTransform, templateString }
}

export function extractI18nKey(code, filePath) {
  let ast = createAst(code)
  const langs = []
  const isIncludeImportModule = ast.program.body.find((n) => {
    return t.isImportDeclaration(n) && n.source.value === 'i18next'
  })
  if (!isIncludeImportModule) {
    return []
  }
  traverse.default(ast, {
    CallExpression(p) {
      const fnName = p.node.callee.name
      const args = p.node.arguments

      if (fnName === 't') {
        if (args?.length === 1) {
          const [arg] = args
          const key = arg.value
          langs.push({
            key,
            value: key,
            filePath,
            pos: p.node.loc?.start,
          })
        }
      }
    },
  })

  return langs
}
