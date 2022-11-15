/**
 * 对代码进行 transformCode 后会添加/减少一些多余的换行，在 git diff 时影响 Review，很不美观
 * 此脚本会对diff的文件进行对比，移除或添加那些换行符
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const diff = require('diff');

// 获取变动的文件
const status = execSync(`cd ../minio-console
git status -s
`).toString('utf-8');
status.split('\n').forEach((d, index) => {
  const p = d.replace('M', '').trim();
  if (p) {
    const filePath = path.join(__dirname, '../../', 'minio-console', p);
    const originPath = path.join(__dirname, './before', p.replace(/portal-ui\//, ''));
    // if (!p.includes('Console/valid-routes.ts')) {
    // return
    // }
    removeWrapLine(originPath, filePath);
  }
});

function removeWrapLine(after, current) {
  const oldCode = fs.readFileSync(after).toString('utf-8');
  const newCode = fs.readFileSync(current).toString('utf-8');

  const result = diff.diffLines(oldCode, newCode);
  fs.writeFileSync(
    current,
    result
      .map((item) => {
        // 移除新增的换行
        if (item.added === true && item.value === '\n' && item.count === 1) {
          return '';
        }
        // 添加被移除的换行
        if (item.removed === true && item.value === '\n' && item.count === 1) {
          return '\n';
        }
        if (item.removed) {
          return '';
        }
        return item.value;
      })
      .join('')
  );
}
