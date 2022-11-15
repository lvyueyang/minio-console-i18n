import t from '@babel/types';
import babelParser from '@babel/parser';

// 至少含有两个以上连续字母
const includeEnglish = (v) => {
  return /[a-zA-Z]{2,}/.test(v);
};
// 是否是一个网址
const isUrl = (v) => {
  return v.startsWith('http://') || v.startsWith('https://');
};
// 是否是一个路径
const isPath = (v) => {
  return /^\/(?:[^/]+\/)*[^/]+$/.test(v);
};

// 校验字符串是否满足要求
export const validateString = (v) => {
  if (typeof v !== 'string') return false;
  const str = v.trim();
  return includeEnglish(str) && !isUrl(str) && !isPath(str);
};

/** 合并空格，去除换行，trim */
export const strZip = (v) => {
  return v
    .trim()
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ');
};

/** 创建一个字符串 AST */
export const createTFN = (value) => {
  return t.callExpression(t.identifier('t'), [t.stringLiteral(strZip(value))]);
};

export const createAst = (code) => {
  return babelParser.parse(code, {
    sourceType: 'module', // default: "script"
    plugins: ['typescript', 'jsx'],
  });
};

/** 添加 i8next 的 import  */
export const unshiftI18nModule = (ast) => {
  const i18nModule = t.importDeclaration(
    [t.importSpecifier(t.identifier('t'), t.identifier('t'))],
    t.StringLiteral('i18next')
  );
  const isIncludeImportModule = ast.program.body.find((n) => {
    return t.isImportDeclaration(n) && n.source.value === 'i18next';
  });
  if (!isIncludeImportModule) {
    i18nModule.leadingComments = ast.program.body[0].leadingComments;
    delete ast.program.body[0].leadingComments;
    ast.program.body.unshift(i18nModule);
  }
};

/** 是否引入了 i8next  */
export const isImportI18nextModule = (ast) =>
  ast.program.body.find((n) => {
    return t.isImportDeclaration(n) && n.source.value === 'i18next';
  });

/** 对于无参数的模板字符串进行国际化 */
export const transformNotParamsTempStr = (p, value) => {
  p.node.expressions = [createTFN(value)];
  const quasi = {
    ...p.node.quasis[0],
    value: {
      raw: '',
      cooked: '',
    },
  };
  p.node.quasis = [
    {
      ...quasi,
      tail: false,
    },
    {
      ...quasi,
      tail: true,
    },
  ];
};
