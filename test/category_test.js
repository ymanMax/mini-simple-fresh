// test/category_test.js —— 分类页搜索/排序/筛选功能专项测试（33项）
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
global.App = (o) => { if (o.onLaunch) o.onLaunch() }
global.getApp = () => ({ globalData: { userInfo: {} } })
global.Component = () => {}
require('../mock/interceptor.js').install()

let pass = 0, fail = 0
function check(name, cond) {
  if (cond) { pass++; process.stdout.write('PASS ' + name + '\n') }
  else { fail++; process.stdout.write('FAIL ' + name + '\n') }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

;(async () => {
  // 加载分类页模块并实例化
  global.Page = (opts) => { global.pageOpts = opts }
  require('../pages/category/index.js')
  const opts = global.pageOpts
  const page = Object.assign({}, opts)
  page.data = JSON.parse(JSON.stringify(opts.data))
  page.setData = function (patch) {
    Object.keys(patch).forEach(k => {
      const parts = k.split('.')
      let cur = page.data
      for (let i = 0; i < parts.length - 1; i++) { cur[parts[i]] = cur[parts[i]] || {}; cur = cur[parts[i]] }
      cur[parts[parts.length - 1]] = patch[k]
    })
  }
  page.route = 'pages/category/index'
  opts.onLoad.call(page, {})

  await sleep(1500) // 等待首次加载完成（200-600ms × 2层）

  // 基础：8个分类、有商品、推荐、分页每页10条
  check('8个分类导航', page.data.categories.length === 8)
  check('当前分类有商品(水果5件)', page.data.allProducts.length >= 5 && page.data.products.length > 0)
  check('推荐商品3个', page.data.recommend.length === 3)
  check('分页每页10条', page.data.pageSize === 10)

  // ---- 1. 分类内搜索：仅对当前分类名称/副标题模糊匹配 ----
  page.onInput({ detail: { value: '车厘子' } })
  await sleep(100)
  check('搜索"车厘子"仅命中水果分类商品', page.data.products.every(g => g.name.indexOf('车厘子') >= 0 || (g.subtitle || '').indexOf('车厘子') >= 0))
  check('搜索结果非空', page.data.resultCount >= 1)

  // 搜索无结果 → 空态（不白屏）
  page.onInput({ detail: { value: '不存在的商品xyz' } })
  await sleep(100)
  check('搜索无结果→空态（products为空）', page.data.products.length === 0 && page.data.resultCount === 0)

  // 清空搜索词（清空图标）→ 恢复完整列表
  page.clearKeyword()
  await sleep(100)
  check('清空搜索词恢复完整列表', page.data.products.length === page.data.allProducts.length || page.data.products.length >= page.data.pageSize)

  // 取消按钮清空
  page.onInput({ detail: { value: '葡萄' } })
  page.cancelSearch()
  await sleep(100)
  check('取消按钮清除搜索词', page.data.keyword === '')

  // ---- 2. 排序：综合/价格升降/销量，选中态红色 ----
  page.chooseSort({ currentTarget: { dataset: { sort: 'price' } } }) // default→priceAsc
  check('首次点价格→升序(priceAsc)', page.data.sort === 'priceAsc')
  const pricesAsc = page.data.products.map(g => g.price)
  check('价格从低到高排列', pricesAsc.every((p, i) => i === 0 || pricesAsc[i - 1] <= p))
  page.chooseSort({ currentTarget: { dataset: { sort: 'price' } } }) // priceAsc→priceDesc
  check('再次点价格→降序(priceDesc)', page.data.sort === 'priceDesc')
  const pricesDesc = page.data.products.map(g => g.price)
  check('价格从高到低排列', pricesDesc.every((p, i) => i === 0 || pricesDesc[i - 1] >= p))
  page.chooseSort({ currentTarget: { dataset: { sort: 'sales' } } })
  check('销量排序(sales)', page.data.sort === 'sales')
  const sales = page.data.products.map(g => g.numberSells)
  check('销量从高到低排列', sales.every((s, i) => i === 0 || sales[i - 1] >= s))
  page.chooseSort({ currentTarget: { dataset: { sort: 'default' } } })
  check('综合排序(default)', page.data.sort === 'default')

  // ---- 3. 自定义筛选 ----
  // 3a. 价格区间（元→分，单边支持）
  page.openFilter()
  check('筛选面板打开', page.data.filterOpen === true)
  page.onPriceMinInput({ detail: { value: '15' } })  // 15元 → 1500分
  page.applyFilterPanel()
  await sleep(100)
  check('最低价15元→商品价≥1500分', page.data.products.every(g => g.price >= 1500))

  page.openFilter()
  page.onPriceMinInput({ detail: { value: '' } })
  page.onPriceMaxInput({ detail: { value: '25' } }) // 25元 → 2500分，单边最高
  page.applyFilterPanel()
  await sleep(100)
  check('最高价25元→商品价≤2500分', page.data.products.every(g => g.price <= 2500))

  // 3b. 仅看有货（库存>0）
  page.openFilter()
  page.onPriceMaxInput({ detail: { value: '' } })
  page.toggleInStock()
  page.applyFilterPanel()
  await sleep(100)
  check('仅看有货→所有商品stock>0', page.data.products.every(g => g.stock > 0))

  // 3c. 优惠类型：会员价（vipPrice < price）
  page.openFilter()
  page.toggleInStock() // 关掉
  page.toggleDiscount({ currentTarget: { dataset: { tag: '会员价' } } })
  page.applyFilterPanel()
  await sleep(100)
  check('会员价筛选→所有商品有vipPrice且vipPrice<price', page.data.products.every(g => g.vipPrice && g.vipPrice < g.price))

  // 促销直降（price < originalPrice）
  page.openFilter()
  page.toggleDiscount({ currentTarget: { dataset: { tag: '会员价' } } }) // 取消会员价
  page.toggleDiscount({ currentTarget: { dataset: { tag: '促销直降' } } })
  page.applyFilterPanel()
  await sleep(100)
  check('促销直降筛选→price<originalPrice', page.data.products.every(g => g.price < g.originalPrice))

  // 3d. 商品标签（按 product_tags 匹配）
  page.openFilter()
  page.toggleDiscount({ currentTarget: { dataset: { tag: '促销直降' } } }) // 取消
  const tag = page.data.availableTags[0]
  page.toggleProductTag({ currentTarget: { dataset: { tag: tag } } })
  page.applyFilterPanel()
  await sleep(100)
  check('商品标签筛选→每件商品命中该标签', page.data.products.every(g => (g.tags || []).indexOf(tag) >= 0))

  // 3e. 重置：清空全部筛选条件，恢复完整列表
  page.openFilter()
  page.resetFilters()
  await sleep(100)
  check('重置后无筛选条件', page.data.priceMin === '' && page.data.priceMax === '' && page.data.inStockOnly === false && page.data.discountTags.length === 0 && page.data.tagFilters.length === 0 && page.data.sort === 'default')
  check('重置后结果=全部分类商品', page.data.resultCount === page.data.allProducts.length)

  // 3f. 确定按钮展示结果数
  page.openFilter()
  page.toggleInStock()
  page.applyFilterPanel()
  await sleep(100)
  check('确定后展示结果数(resultCount>0)', page.data.resultCount > 0)

  // ---- 4. 搜索+排序+筛选叠加 ----
  page.openFilter()
  page.toggleInStock() // 关掉
  page.resetFilters()
  page.onInput({ detail: { value: '葡萄' } })
  page.chooseSort({ currentTarget: { dataset: { sort: 'price' } } }) // priceAsc
  await sleep(100)
  check('搜索+升序叠加：结果按价格升序且命中葡萄', (() => {
    const p = page.data.products.map(g => g.price)
    return p.every((x, i) => i === 0 || p[i - 1] <= x) && page.data.products.every(g => g.name.indexOf('葡萄') >= 0 || (g.subtitle || '').indexOf('葡萄') >= 0)
  })())

  // ---- 5. 切换分类：自动清空关键词并恢复该分类完整列表 ----
  page.onInput({ detail: { value: '葡萄' } })
  await sleep(50)
  page.switchCategory({ currentTarget: { dataset: { id: 'veg', name: '蔬菜' } } })
  await sleep(1200) // 重新拉取
  check('切换分类自动清空关键词', page.data.keyword === '')
  check('切换分类恢复该分类完整列表（蔬菜）', page.data.allProducts.every(g => g.categoryId === 'veg') && page.data.resultCount === page.data.allProducts.length)
  check('切分类后排序重置为综合', page.data.sort === 'default')

  // ---- 6. 分页：每页10条，加载更多，加载完显示"没有更多了" ----
  page.switchCategory({ currentTarget: { dataset: { id: 'fruit', name: '水果' } } })
  await sleep(1200)
  check('水果分类5件→首页即全部,noMore=true', page.data.noMore === true && page.data.products.length === 5)
  check('分页每页10条(pageSize=10)', page.data.pageSize === 10)

  // ---- 7. 所有WXML绑定处理器存在（无点击无响应） ----
  const handlers = ['onInput','clearKeyword','cancelSearch','chooseSort','openFilter','closeFilter','onPriceMinInput','onPriceMaxInput','toggleInStock','toggleDiscount','toggleProductTag','resetFilters','applyFilterPanel','switchCategory','goDetail','addCart','goSearch','onImgError','loadMore','onReachBottom','onPullDownRefresh']
  const missing = handlers.filter(h => typeof page[h] !== 'function')
  check('全部处理器齐全（无死链/无点击无响应）', missing.length === 0)

  process.stdout.write(`\n=== Category Test: ${pass} passed, ${fail} failed ===\n`)
  process.exit(fail ? 1 : 0)
})().catch(e => { process.stderr.write('CATEGORY TEST ERROR: ' + e.message + '\n' + e.stack + '\n'); process.exit(1) })
