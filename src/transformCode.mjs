/**
 * 核心脚本，使用babel对code进行添加和提取
 */
import traverse from '@babel/traverse';
import generator from '@babel/generator';
import t from '@babel/types';

import { includeCommonCompAttrs, includeCompAttrs } from './config.mjs';
import {
  strZip,
  validateString,
  createTFN,
  createAst,
  unshiftI18nModule,
  transformNotParamsTempStr,
  isImportI18nextModule,
} from './utils.mjs';

// 对 jsx 属性中的规则跳过判断
const isSkipJsxAttrRule = (p) => {
  /** 组件名称 */
  const compName = p.parent.name.name;
  /** 组件属性名称 */
  const attrName = p.node.name.name;
  /** 属性值 */
  const attrValue = p.node.value;

  // 对属性值是 jsxElement 无需后续精确判断
  if (t.isJSXElement(attrValue?.expression)) {
    return false;
  }

  // 通用属性
  if (includeCommonCompAttrs.includes(attrName)) {
    return false;
  }

  // 精确匹配
  const isInclude = includeCompAttrs[compName]?.attrs?.includes(attrName);
  if (isInclude) {
    return false;
  }

  return true;
};

/** 添加国际化 */
export function transformFile(code) {
  let isTransform = false;
  let templateString = [];
  let ast = createAst(code);

  // 对 object 中所有相关的 key 进行递归转换
  const transformObjectKey = (properties, valueKeys) => {
    if (!Array.isArray(properties)) return;
    properties.forEach((prop) => {
      // 字符串属性
      if (t.isStringLiteral(prop?.value)) {
        const includeKey = valueKeys.includes(prop?.key?.name);
        if (includeKey) {
          prop.value = createTFN(prop.value.value);
          isTransform = true;
        }
      }
      // 数组 递归
      if (t.isArrayExpression(prop?.value)) {
        prop?.value?.elements.forEach((ele) => {
          transformObjectKey(ele.properties);
        });
      }
      // 对象 递归
      if (t.isObjectExpression(prop?.value)) {
        transformObjectKey(prop?.value?.properties);
      }
    });
  };

  traverse.default(ast, {
    enter(p) {
      // import 直接跳过
      if (t.isImportDeclaration(p)) {
        p.skip();
      }
      // createStyles 方法直接跳过，严谨来说应该判断上下文
      if (t.isCallExpression(p) && p.node.callee.name === 'createStyles') {
        p.skip();
      }
      // 判断条件直接跳过
      if (t.isBinaryExpression(p)) {
        p.skip();
      }
    },
    ConditionalExpression(p) {
      /**
       * 三目运算中的判断
       * 是否是 jsx，parent 不是变量
       */
      if (
        t.isJSXElement(p.node.consequent) ||
        t.isJSXElement(p.node.alternate) ||
        !t.isVariableDeclarator(p.parent)
      ) {
        return;
      }
      // 判断是否在 react 组件中
      let isJsxChildren = false;
      p.findParent((parentPath) => {
        if (t.isJSXElement(parentPath.node)) {
          isJsxChildren = true;
        }
      });
      if (isJsxChildren) {
        return;
      }
      p.skip();
    },
    CallExpression(p) {
      // 针对函数做判断
      const fnName = p.node.callee.name;
      if (t.isMemberExpression(p.node.callee)) {
        if (p.node.callee.object.name === 'api' && p.node.callee.property.name === 'invoke') {
          p.skip();
        }
      }

      // 对 permissionTooltipHelper 方法的第二个参数进行国际化
      if (fnName === 'permissionTooltipHelper') {
        const args = p.node.arguments;
        const strArg = args[1] || {};
        if (strArg.type === 'StringLiteral' && validateString(strArg.value)) {
          p.replaceWith(
            t.callExpression(
              p.node.callee,
              args.map((arg, index) => {
                if (index === 1) {
                  isTransform = true;
                  return createTFN(arg.value);
                }
                return arg;
              })
            )
          );
          return;
        }
      }
    },
    JSXAttribute(p) {
      if (isSkipJsxAttrRule(p)) {
        p.skip();
      } else {
        /** 组件名称 */
        const compName = p.parent.name.name;
        /** 组件属性名称 */
        const attrName = p.node.name.name;
        /** 属性值 */
        const attrValue = p.node.value;
        const value = attrValue?.value;

        if (validateString(value) && t.isStringLiteral(attrValue)) {
          p.node.value = t.jsxExpressionContainer(createTFN(value));
          isTransform = true;
        }
        if (t.isJSXExpressionContainer(attrValue)) {
          const valueKeys = includeCompAttrs[compName]?.keys?.[attrName];
          if (!valueKeys?.length) {
            return;
          }

          // 针对数组
          // <SelectWrapper
          //   options={[{ label: "readonly", value: "readonly" }]}
          // />
          // 针对直接使用数组变量形式做出国际化
          if (t.isArrayExpression(attrValue.expression)) {
            attrValue.expression.elements.forEach((ele) => {
              transformObjectKey(ele.properties, valueKeys);
            });
          }
          // 针对对象
          // <SelectWrapper
          //   options={{ label: "readonly", value: "readonly" }}
          // />
          if (t.isObjectExpression(attrValue.expression)) {
            transformObjectKey(attrValue.expression.properties, valueKeys);
          }
          // 针对引用类型取作用域，然后改变
          // const accessOptions = [{ label: "readonly", value: "readonly" }]
          // <SelectWrapper
          //   options={accessOptions}
          // />
          if (t.isIdentifier(attrValue.expression)) {
            const isIdentifierName = attrValue.expression.name;
            const valuePath = p.scope.getBinding(isIdentifierName).path;
            const valueNode = valuePath.node;
            if (t.isVariableDeclarator(valueNode)) {
              valueNode.init.elements?.forEach((ele) => {
                transformObjectKey(ele.properties, valueKeys);
              });
            }
          }
        }
        return;
      }
    },
    JSXText(p) {
      const { node } = p;
      const { value } = node;
      if (validateString(value)) {
        p.replaceWith(t.jsxExpressionContainer(createTFN(value)));
        isTransform = true;
        return;
      }
      p.skip();
    },
    JSXElement(p) {
      const { openingElement } = p.node;
      const compName = openingElement?.name?.name;
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
        p.node.children.forEach((c) => {
          if (t.isJSXExpressionContainer(c) && t.isObjectExpression(c.expression)) {
            c.expression.properties.forEach((p) => {
              if (t.isObjectProperty(p) && p.key.name === 'tabConfig') {
                p.value.properties.forEach((item) => {
                  if (item.key.name === 'label' && t.isStringLiteral(item.value)) {
                    const str = item.value.value;
                    if (validateString(str)) {
                      isTransform = true;
                      item.value = createTFN(item.value.value);
                    }
                  }
                });
              }
            });
          }
        });
      }
    },
    StringLiteral(p) {
      const { node, parent } = p;
      const { value } = node;
      if (validateString(value)) {
        if (t.isJSXExpressionContainer(parent) || t.isConditionalExpression(parent)) {
          // console.log(`[${value}] -> `, node)
          p.replaceWithSourceString(`t("${strZip(value)}")`);
          isTransform = true;
          return;
        }
      }
      p.skip();
    },
    TemplateLiteral(p) {
      // 模板字符串需要自己手动处理，因为各个语言下语境不同，拼接不同

      // 对于无参数的模板字符串进行国际化
      if (!p.node.expressions.length && !t.isCallExpression(p.parent)) {
        const raw = p.node.quasis[0].value.raw;
        if (validateString(raw)) {
          if (t.isJSXExpressionContainer(p.parent) || t.isConditionalExpression(p.parent)) {
            transformNotParamsTempStr(p, raw);
            isTransform = true;
            return;
          }
        }
      } else {
        templateString.push({
          pos: p.node.loc?.start,
        });
      }
    },
  });
  if (isTransform) {
    unshiftI18nModule(ast);
  }
  const output = generator.default(ast, {
    retainLines: true,
  });
  return { output, isTransform, templateString };
}

/** 提取国际化 key */
export function extractI18nKey(code, filePath) {
  let ast = createAst(code);
  const langs = [];
  if (!isImportI18nextModule(ast)) {
    return [];
  }
  traverse.default(ast, {
    CallExpression(p) {
      const fnName = p.node.callee.name;
      const args = p.node.arguments;

      if (fnName === 't') {
        if (args?.length === 1) {
          const [arg] = args;
          const key = arg.value;
          langs.push({
            key,
            value: key,
            filePath,
            pos: p.node.loc?.start,
          });
        }
      }
    },
  });

  return langs;
}
