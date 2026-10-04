// test/harness.js —— 页面集成测试：实例化每个页面，调用 onLoad/onShow，校验WXML绑定的处理器都存在、setData不报错
const fs = require('fs')
const path = require('path')

// ---- wx 全量 mock ----
const storage = {}
global.wx = {
  getStorageSync: (k) => storage[k] !== undefined ? storage[k] : null,
  setStorageSync: (k, v) => { storage[k] = v },
  showToast: () => {}, showModal: () => {}, showLoading: () => {}, hideLoading: () => {},
  navigateTo: () => {}, switchTab: () => {}, redirectTo: () => {}, reLaunch: () => {},
  makePhoneCall: () => {}, setTabBarBadge: () => {}, removeTabBarBadge: () => {},
  previewImage: () => {}, actionSheet: () => {}, stopPullDownRefresh: () => {},
  login: () => {}, getSetting: () => {}, getUserInfo: () => {}
}
global.App = (o) => { global.appInstance = o; if (o.onLaunch) o.onLaunch() }
global.getApp = () => global.appInstance
global.Component = () => {}

// 安装拦截器（会替换 wx.request）
require('../mock/interceptor.js').install()

// ---- Page 捕获 ----
const pages = {}
global.Page = (opts) => { pages[currentPageFile] = opts }
let currentPageFile = null

// ---- 加载 app.js ----
require('../app.js')

// ---- 遍历页面 ----
const pagesDir = path.join(__dirname, '..', 'pages')
let errors = 0, pageCount = 0

function collectHandlers(wxml) {
  const handlers = new Set()
  const re = /(?:bindtap|catchtap|bindinput|bindconfirm|bindchange|bindtouchstart|bindtouchend|binderror|bindtap)="([^"]+)"/g
  let m
  while ((m = re.exec(wxml)) !== null) handlers.add(m[1])
  return handlers
}

function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) return walk(p)
    if (!f.endsWith('.js')) return
    const rel = path.relative(path.join(__dirname, '..'), p)
    if (f === 'index.js' && dir.includes('category')) {}
    currentPageFile = rel
    pageCount++
    try { require(p) } catch (e) { errors++; console.log('LOAD ERROR', rel, e.message); return }
  })
}
walk(pagesDir)

// ---- 逐个实例化页面：onLoad/onShow + 检查 handler ----
Object.keys(pages).forEach(rel => {
  const opts = pages[rel]
  const wxmlPath = path.join(__dirname, '..', rel.replace(/\.js$/, '.wxml'))
  const wxml = fs.readFileSync(wxmlPath, 'utf8')
  const handlers = collectHandlers(wxml)
  handlers.forEach(h => {
    if (typeof opts[h] !== 'function') {
      errors++
      console.log('MISSING HANDLER', rel, '→', h)
    }
  })
  // 实例化：创建 this 上下文，调用 onLoad/onShow（异步数据会用 promise，setData 立即生效）
  const instance = Object.assign({}, opts)
  instance.data = JSON.parse(JSON.stringify(opts.data || {}))
  instance.setData = function (patch) {
    Object.keys(patch).forEach(k => {
      // 支持 a.b.c 路径
      const parts = k.split('.')
      let cur = instance.data
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] || {}
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = patch[k]
    })
  }
  instance.route = rel
  try {
    if (opts.onLoad) opts.onLoad.call(instance, { id: 'g1', status: '1', tab: 'collect', section: 'shop', mode: 'list' })
    if (opts.onShow) opts.onShow.call(instance)
  } catch (e) {
    errors++
    console.log('LIFECYCLE ERROR', rel, e.message)
  }
})

console.log('\n=== ' + pageCount + ' page files loaded, ' + errors + ' errors ===')
process.exit(errors ? 1 : 0)
