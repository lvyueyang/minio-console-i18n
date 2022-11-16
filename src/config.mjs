/**
 * 这里聚合了脚本执行时的一些配置文件
 */
import glob from 'glob';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const uiSrcDir = path
  .join(__dirname, '../../minio-console/portal-ui/src/')
  .replace(/\\/g, '/');

let targetPath = '**/*.tsx';
// targetPath = 'screens/Console/Buckets/BucketDetails/BucketDetails.tsx';

export const target = `${uiSrcDir}${targetPath}`;
export const ignoreTargetList = [`${uiSrcDir}${'screens/Console/Common/IconsScreen.tsx'}`];
const ignoreFiles = [];
ignoreTargetList.forEach((target) => {
  ignoreFiles.push(...glob.sync(target));
});
export { ignoreFiles };

/** 添加国际化函数后提取出的 en 文件 */
export const enFileJson = path.join(__dirname, '../dist/i18n/en.json');
/** 翻译后的文件 */
export const cnFileJson = path.join(__dirname, '../dist/i18n/zh-cn.json');
/** 提取 en 文件时生成的日志 */
export const logFileJson = path.join(__dirname, '../dist/i18n/log.json');
/** 需要进行手动翻译的模板字符串 */
export const tempLogFileJson = path.join(__dirname, '../dist/i18n/template-string-log.json');

/** 针对所有组件的属性进行国际化，慎用 */
export const includeCommonCompAttrs = ['placeholder', 'label'];

/** 可以被国际化的组件属性 */
export const includeCompAttrs = JSON.parse(
  fs.readFileSync(path.join(__dirname, './includeCompAttrs.json'))
);
