import glob from 'glob';
import fs from 'fs';
import { transformFile } from './transformCode.mjs';
import { target, tempLogFileJson, __dirname } from './config.mjs';

function main() {
  console.log('=============== 添加国际化方法 START =============');

  const templateFiles = [];
  const files = glob.sync(target);
  const ignorePath = ['screens/Console/Common/IconsScreen'];
  let editTotal = 0;
  files.forEach((filePath) => {
    if (ignorePath.map((f) => filePath.includes(f)).filter((i) => i).length) {
      return;
    }

    const code = fs.readFileSync(filePath).toString('utf-8');
    const { output, isTransform, templateString } = transformFile(code, filePath);
    if (isTransform) {
      console.log('File: ', filePath);
      editTotal += 1;
      console.log('已修改 (Modified)');
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
  console.log('已修改数 (Modified):', editTotal);
  console.log('未修改数 (Unmodified):', files.length - editTotal);
  console.log('=============== 添加国际化方法 END =============');

  fs.writeFileSync(tempLogFileJson, JSON.stringify(templateFiles, null, 2));
}

main();
