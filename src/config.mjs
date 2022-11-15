/**
 * 这里聚合了脚本执行时的一些配置文件
 */
import path from 'path';
import { fileURLToPath } from 'url';

export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

export const uiSrcDir = path
  .join(__dirname, '../../minio-console/portal-ui/src/')
  .replace(/\\/g, '/');

let targetPath = '**/*.tsx';
// targetPath = 'screens/Console/Users/DeleteUser.tsx'

export const target = `${uiSrcDir}${targetPath}`;

/** 添加国际化函数后提取出的 en 文件 */
export const enFileJson = path.join(__dirname, '../dist/i18n/en.json');
/** 翻译后的文件 */
export const cnFileJson = path.join(__dirname, '../dist/i18n/zh-cn.json');
/** 提取 en 文件时生成的日志 */
export const logFileJson = path.join(__dirname, '../dist/i18n/log.json');
/** 需要进行手动翻译的模板字符串 */
export const tempLogFileJson = path.join(__dirname, '../dist/i18n/template-string-log.json');

/** 可以被国际化的组件属性 */
export const includeCompAttrs = [
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
];

/** 对组件中的对象属性中的字符串做国际化, 像下面这种, 支持引用类型
  <SelectWrapper
    options={[{ label: "readonly", value: "readonly" }]}
  />
*/
export const includeCompObjectAttrs = [
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
];
