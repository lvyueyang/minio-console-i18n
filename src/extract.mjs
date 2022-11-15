import glob from 'glob';
import fs from 'fs';
import path from 'path';

import { enFileJson, logFileJson, uiSrcDir, __dirname } from './config.mjs';
import { extractI18nKey } from './transformCode.mjs';

console.log('==== 国际化 t 函数 key 提取开始 START ====');
glob(`${uiSrcDir}**/*.ts{,x}`, (err, files) => {
  const lang = [];
  files.forEach((filePath) => {
    const code = fs.readFileSync(filePath).toString('utf-8');
    const data = extractI18nKey(code, path.join(__dirname, '../', filePath));
    lang.push(...data);
  });

  /** 生成一个日志 */
  fs.writeFileSync(logFileJson, JSON.stringify(lang, null, 2));

  const lang_en = {};
  lang.forEach(({ key, value }) => {
    if (!lang_en[key]) {
      lang_en[key] = value;
    }
  });
  fs.writeFileSync(enFileJson, JSON.stringify(lang_en, null, 2));
  console.log('==== 国际化 t 函数 key 提取结束 END ====');
});
