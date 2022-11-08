/* eslint-disable no-loop-func */
import fs from 'fs'
import path from 'path'
import { __dirname } from './config.mjs'
import fanyi from '../fanyi/index.mjs'

console.log('======== 翻译开始 =======')

const enPath = path.join(__dirname, '../lang_en.json')
const cnPath = path.join(__dirname, '../lang_zhCN.json')

const enJson = fs.readFileSync(enPath).toString('utf-8')
const en = JSON.parse(enJson)

let zhCN = {}
if (fs.statSync(cnPath).isFile()) {
  const zhCNJson = fs.readFileSync(cnPath).toString('utf-8')
  zhCN = JSON.parse(zhCNJson)
  Object.keys(zhCN).forEach((key) => {
    if (!en[key]) {
      // 去除 cn 中已经过期的翻译
      delete zhCN[key]
    }
  })
}

const enList = Object.entries(en)
const total = enList.length

console.log(`新增 ${total - Object.values(zhCN).length} 个`)
console.log(`Add ${total - Object.values(zhCN).length} files`)

const logData = {
  skip: [],
  success: [],
  error: [],
}

async function loop(num = 0) {
  if (!enList[num]) return
  const [key, value] = enList[num]
  const nextNo = num + 1
  const current = `${nextNo}/${total}`

  if (zhCN[key]) {
    // console.log(`第 ${current} 个，已翻译跳过`)
    logData.skip.push(nextNo)
    await loop(nextNo)
  } else {
    try {
      const res = await fanyi(value)
      zhCN[key] = res
      logData.success.push(nextNo)
      console.log(`第 ${current} 个，翻译完成`)
      console.log(`The ${current} file success to translate`)
    } catch (e) {
      logData.error.push(nextNo)
      console.log(`第 ${current} 个，翻译失败`)
      console.log(`The ${current} file failed to translate`)
      console.log(key, e)
    }
    await loop(nextNo)
  }
}

await loop()

fs.writeFileSync(cnPath, JSON.stringify(zhCN, null, 2))

console.log('搞定! (done)')
console.log('跳过 (skip):', logData.skip.length)
console.log('成功 (success): ', logData.success.length)
console.log('失败 (failed): ', logData.error.length)
