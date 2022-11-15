import glob from 'glob';
import fs from 'fs';
import { transformFile } from './transformCode.mjs';
import { ignoreFiles, target, tempLogFileJson, __dirname } from './config.mjs';

console.log('ignoreFiles', ignoreFiles);
function main() {
  console.log('=============== 添加国际化方法 START =============');

  const templateFiles = [];
  const files = glob.sync(target);
  let editTotal = 0;
  files.forEach((filePath) => {
    if (ignoreFiles.includes(filePath)) {
      return;
    }

    const code = fs.readFileSync(filePath).toString('utf-8');
    const { output, isTransform, templateString } = transformFile(code, filePath);
    if (isTransform) {
      editTotal += 1;
      console.log('已修改 (Modified)', filePath);
      fs.writeFileSync(filePath, output.code);
    }

    if (templateString.length) {
      templateFiles.push({
        filePath,
        pos: templateString,
      });
    }
  });
  console.log('文件总数 (Total Files):', files.length);
  console.log('已忽略 (Ignore):', ignoreFiles.length);
  console.log('未修改 (NotModified):', files.length - ignoreFiles.length - editTotal);
  console.log('已修改 (Modified):', editTotal);
  console.log('=============== 添加国际化方法 END =============');

  fs.writeFileSync(tempLogFileJson, JSON.stringify(templateFiles, null, 2));
}

main();
