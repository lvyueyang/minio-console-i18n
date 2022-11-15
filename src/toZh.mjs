/**
 * 对 en.json 中的值进行翻译
 */
import fs from 'fs';
import { cnFileJson, enFileJson, __dirname } from './config.mjs';
import fanyi from '../fanyi/index.mjs';

console.log('======== 翻译开始 =======');

const enJson = fs.readFileSync(enFileJson).toString('utf-8');
const en = JSON.parse(enJson);

let zhCN = {};
if (fs.statSync(cnFileJson).isFile()) {
  const zhCNJson = fs.readFileSync(cnFileJson).toString('utf-8');
  zhCN = JSON.parse(zhCNJson);
  Object.keys(zhCN).forEach((key) => {
    if (!en[key]) {
      // 去除 cn 中已经过期的翻译
      delete zhCN[key];
    }
  });
}

const enList = Object.entries(en);
const total = enList.length;

console.log(`新增 (Add) ${total - Object.values(zhCN).length}`);

const logData = {
  skip: [],
  success: [],
  error: [],
};

async function loop(num = 0) {
  if (!enList[num]) return;
  const [key, value] = enList[num];
  const nextNo = num + 1;
  const current = `${nextNo}/${total}`;

  if (zhCN[key]) {
    // console.log(`第 ${current} 个，已翻译跳过`)
    logData.skip.push(nextNo);
    await loop(nextNo);
  } else {
    try {
      const res = await fanyi(value);
      zhCN[key] = res;
      logData.success.push(nextNo);
      console.log(`第 ${current} 个，翻译完成`);
      console.log(`The ${current} file success to translate`);
    } catch (e) {
      logData.error.push(nextNo);
      console.log(`第 ${current} 个，翻译失败`);
      console.log(`The ${current} file failed to translate`);
      console.log(key, e);
    }
    await loop(nextNo);
  }
}

await loop();

fs.writeFileSync(cnFileJson, JSON.stringify(zhCN, null, 2));

console.log('搞定! (done)');
console.log('跳过 (skip):', logData.skip.length);
console.log('成功 (success): ', logData.success.length);
console.log('失败 (failed): ', logData.error.length);
