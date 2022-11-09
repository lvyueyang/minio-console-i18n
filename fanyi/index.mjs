import MD5 from './md5.mjs'
import axios from 'axios'
import fs from 'fs'

const { BAIDU_APPID, BAIDU_KEY } = JSON.parse(
  fs.readFileSync('./.env.local.json').toString('utf-8')
)

const appid = BAIDU_APPID
const key = BAIDU_KEY

// 多个query可以用\n连接  如 query='apple\norange\nbanana\npear'
const from = 'en'
const to = 'zh'

export default (query) => {
  const salt = new Date().getTime()
  const str1 = appid + query + salt + key
  const sign = MD5(str1)
  const params = {
    q: query,
    appid: appid,
    salt: salt,
    from: from,
    to: to,
    sign: sign,
  }
  // return Promise.resolve(query)
  return axios
    .get(`http://api.fanyi.baidu.com/api/trans/vip/translate`, {
      params,
    })
    .then((res) => {
      let str = ''
      if (Array.isArray(res.data.trans_result)) {
        res.data.trans_result.forEach((item) => {
          str += item.dst
        })
      } else {
        console.log(`${query} 翻译失败`, res.data)
        return query
      }

      return str
    })
}
