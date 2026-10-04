// test/harness2.js —— 等待异步完成后，检查每个页面实例渲染数据非空（防白屏/空数据）
const fs = require('fs')
const path = require('path')

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

require('../mock/interceptor.js').install()

// 预置购物车与结算商品，便于购物车/订单确认页有数据
const store = require('../mock/store.js')
store.addToCart('g1', '标准装 · 常规包装', 1)
store.addToCart('g3', '精选装 · 常规包装', 1)
storage['buy_items'] = [{ goodsId: 'g1', name: '智利车厘子400g*1盒', pic: '/images/item/01.jpg', specText: '标准装 · 常规包装', price: 2990, count: 1 }]

const pages = {}
let currentPageFile = null
global.Page = (opts) => { pages[currentPageFile] = opts }

require('../app.js')

const pagesDir = path.join(__dirname, '..', 'pages')
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) return walk(p)
    if (!f.endsWith('.js')) return
    currentPageFile = path.relative(path.join(__dirname, '..'), p)
    require(p)
  })
}
walk(pagesDir)

// 每个页面的 onLoad 参数
const loadOptions = {
  'pages/detail/detail.js': { id: 'g1' },
  'pages/order/detail.js': { id: 'o3' },
  'pages/order/review.js': { id: 'o5' },
  'pages/address/edit.js': { id: 'a1' },
  'pages/address/list.js': { mode: 'list' },
  'pages/collection/index.js': { tab: 'collect' },
  'pages/shop-info/index.js': { section: 'shop' }
}

// 实例化所有页面
const instances = {}
Object.keys(pages).forEach(rel => {
  const opts = pages[rel]
  const instance = Object.assign({}, opts)
  instance.data = JSON.parse(JSON.stringify(opts.data || {}))
  instance.setData = function (patch) {
    Object.keys(patch).forEach(k => {
      const parts = k.split('.')
      let cur = instance.data
      for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]] }
      cur[parts[parts.length - 1]] = patch[k]
    })
  }
  instance.route = rel
  instances[rel] = instance
  try {
    const opt = loadOptions[rel] || {}
    if (opts.onLoad) opts.onLoad.call(instance, opt)
    if (opts.onShow) opts.onShow.call(instance)
  } catch (e) { console.log('LIFECYCLE ERROR', rel, e.message, e.stack) }
})

setTimeout(() => {
  const checks = [
    ['pages/index/index.js', ['goods', 'banners', 'lanternArea'], '首页'],
    ['pages/detail/detail.js', ['product', 'reviews', 'recommend'], '详情'],
    ['pages/shop/shop.js', ['items', 'recommend'], '购物车'],
    ['pages/buy/buy.js', ['items', 'coupons', 'payAmount'], '订单确认'],
    ['pages/order/list.js', ['orders'], '订单列表'],
    ['pages/order/detail.js', ['order', 'timeline'], '订单详情'],
    ['pages/order/review.js', ['items'], '评价页'],
    ['pages/me/me.js', ['member', 'orderCounts', 'groups'], '个人中心'],
    ['pages/category/index.js', ['categories', 'products', 'recommend'], '分类页'],
    ['pages/search/search.js', ['hotWords', 'history'], '搜索页'],
    ['pages/coupon/index.js', ['center', 'myCoupons'], '优惠券'],
    ['pages/member/points.js', ['member', 'records', 'gifts'], '积分'],
    ['pages/member/checkin.js', ['member', 'calendar'], '签到'],
    ['pages/messages/index.js', ['allMessages', 'list'], '消息'],
    ['pages/my/collect.js', ['favorites'], '收藏'],
    ['pages/my/footprint.js', ['groups'], '足迹'],
    ['pages/promotion/index.js', ['seckillGoods', 'sessions', 'couponCenter'], '促销'],
    ['pages/shop-info/index.js', ['shop', 'groupBuy'], '店铺信息'],
    ['pages/company/company.js', []],
    ['pages/address/list.js', ['addresses']],
    ['pages/address/edit.js', ['form', 'districts']],
    ['pages/vip/vip.js', ['benefits', 'redbags', 'products']],
    ['pages/logs/logs.js', ['logs']],
    ['pages/my/my.js', ['member', 'menu']]
  ]
  let fail = 0
  checks.forEach(([rel, keys, label]) => {
    const inst = instances[rel]
    if (!inst) { console.log('MISSING INSTANCE', rel); fail++; return }
    keys.forEach(k => {
      const v = inst.data[k]
      const empty = v === undefined || v === null || (Array.isArray(v) && v.length === 0)
      if (empty) { console.log('EMPTY', rel, k, '(' + label + ')'); fail++ }
    })
  })
  console.log('首页商品数:', instances['pages/index/index.js'].data.goods.length)
  console.log('订单数:', instances['pages/order/list.js'].data.orders.length)
  console.log('购物车项:', instances['pages/shop/shop.js'].data.items.length)
  console.log('详情商品:', instances['pages/detail/detail.js'].data.product && instances['pages/detail/detail.js'].data.product.name)
  console.log('订单确认应付:', instances['pages/buy/buy.js'].data.payAmount)
  console.log('coupons:', instances['pages/coupon/index.js'].data.center.length, 'myCoupons:', instances['pages/coupon/index.js'].data.myCoupons.length)
  console.log('地址:', instances['pages/address/list.js'].data.addresses.length, '消息:', instances['pages/messages/index.js'].data.messages.length)
  console.log('\n=== checks failed:', fail, '===')
  process.exit(fail ? 1 : 0)
}, 1500)
