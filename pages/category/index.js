const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

// 筛选选项：优惠类型 + 商品标签
const DISCOUNT_OPTIONS = [
  { key: 'memberPrice', label: '会员价' },
  { key: 'promo', label: '促销/直降' }
]
const ALL_TAGS = ['顺丰包邮', '产地直发', '当季现摘', '坏果包赔', '冷链直达', '当日达', '品牌直供', '检疫合格']

Page({
  data: {
    categories: [], current: '水果', counts: {},
    products: [], recommends: [],
    page: 1, hasMore: true, loading: true, loadingMore: false,
    allGoods: [],
    // 搜索
    kw: '',
    // 排序：default 综合 / price 价格 / sales 销量；priceAsc 升序
    sortKey: 'default', priceAsc: true,
    // 筛选面板
    showFilterPanel: false,
    draft: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
    applied: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
    resultCount: 0, filteringActive: false,
    discountOptions: DISCOUNT_OPTIONS.map(o => Object.assign({}, o, { selected: false })),
    allTags: ALL_TAGS.map(t => ({ tag: t, selected: false }))
  },

  // 同步面板选项选中态（WXML 不支持 includes 方法，用预计算布尔）
  syncPanelOptions() {
    const draft = this.data.draft
    this.setData({
      discountOptions: DISCOUNT_OPTIONS.map(o => Object.assign({}, o, { selected: draft.discountTypes.indexOf(o.key) >= 0 })),
      allTags: ALL_TAGS.map(t => ({ tag: t, selected: draft.tags.indexOf(t) >= 0 }))
    })
  },

  onLoad() { this.loadAll() },
  onShow() { this.refreshCartBadge() },

  loadAll() {
    this.setData({ loading: true })
    api.goodsList({ page: 1, size: 100 }).then(res => {
      const all = res.list.map(dec.goods)
      const counts = {}
      all.forEach(g => { counts[g.categoryName] = (counts[g.categoryName] || 0) + 1 })
      const cats = ['水果','蔬菜','肉类','水产','乳品','零食','饮品','日用'].map(name => ({ name: name, count: counts[name] || 0 }))
      this.setData({ allGoods: all, categories: cats, counts: counts })
      this.applyFilters()
    }).catch(() => { this.setData({ loading: false }) })
  },

  // ============ 核心：搜索 + 排序 + 筛选 同一结果集 ============
  applyFilters() {
    const { allGoods, current, kw, applied, sortKey, priceAsc } = this.data
    // 1) 仅当前分类
    let list = allGoods.filter(g => g.categoryName === current)
    // 2) 搜索：名称/副标题模糊匹配（当前分类内）
    const q = (kw || '').trim().toLowerCase()
    if (q) {
      list = list.filter(g => g.name.toLowerCase().indexOf(q) >= 0 || (g.subtitle || '').toLowerCase().indexOf(q) >= 0)
    }
    // 3) 自定义筛选
    const minFen = applied.minPrice ? Math.round(parseFloat(applied.minPrice) * 100) : null
    const maxFen = applied.maxPrice ? Math.round(parseFloat(applied.maxPrice) * 100) : null
    list = list.filter(g => {
      if (minFen !== null && g.price < minFen) return false
      if (maxFen !== null && g.price > maxFen) return false
      if (applied.inStockOnly && g.stock <= 0) return false
      // 优惠类型：会员价(vipPrice<price) / 促销直降(originalPrice>price)
      if (applied.discountTypes.includes('memberPrice') && !(g.vipPrice < g.price)) return false
      if (applied.discountTypes.includes('promo') && !(g.originalPrice > g.price)) return false
      // 商品标签：任一命中
      if (applied.tags.length && !applied.tags.some(t => (g.tags || []).indexOf(t) >= 0)) return false
      return true
    })
    // 4) 排序
    if (sortKey === 'price') list = list.slice().sort((a, b) => priceAsc ? a.price - b.price : b.price - a.price)
    else if (sortKey === 'sales') list = list.slice().sort((a, b) => b.sells - a.sells)
    // 默认综合：保持接口顺序（销量降序）

    this._result = list
    const recommends = allGoods.filter(g => g.categoryName === current).slice(0, 3)
    const page = this.data.page || 1
    const paged = list.slice((page - 1) * 10, page * 10)
    const filteringActive = !!q || applied.inStockOnly || applied.discountTypes.length > 0 || applied.tags.length > 0 || applied.minPrice || applied.maxPrice
    this.setData({
      products: page === 1 ? paged : this.data.products.concat(paged),
      recommends: recommends,
      resultCount: list.length, hasMore: page * 10 < list.length,
      loading: false, loadingMore: false, filteringActive: filteringActive
    })
  },

  // ============ 1. 搜索 ============
  onSearchInput(e) {
    this.setData({ kw: e.detail.value, page: 1 })
    this.applyFilters()
  },
  clearKw() {
    this.setData({ kw: '', page: 1 })
    this.applyFilters()
  },
  cancelSearch() {
    // 取消：清空搜索词 + 重置排序 + 重置筛选，恢复该分类完整列表
    this.setData({
      kw: '', page: 1, sortKey: 'default', priceAsc: true,
      applied: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
      draft: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
      showFilterPanel: false
    })
    this.applyFilters()
  },

  // ============ 2. 排序栏 ============
  switchSort(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'price' && this.data.sortKey === 'price') {
      // 价格排序：点击切换升降序
      this.setData({ priceAsc: !this.data.priceAsc, page: 1 })
    } else {
      this.setData({ sortKey: key, page: 1 })
    }
    this.applyFilters()
  },

  // ============ 3. 自定义筛选面板 ============
  openFilter() {
    this.setData({ showFilterPanel: true, draft: JSON.parse(JSON.stringify(this.data.applied)) })
    this.syncPanelOptions()
  },
  closeFilter() { this.setData({ showFilterPanel: false }) },
  pickDiscount(e) {
    const key = e.currentTarget.dataset.key
    const draft = this.data.draft
    const arr = draft.discountTypes.slice()
    const idx = arr.indexOf(key)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(key)
    this.setData({ draft: Object.assign({}, draft, { discountTypes: arr }) })
    this.syncPanelOptions()
  },
  pickTag(e) {
    const tag = e.currentTarget.dataset.tag
    const draft = this.data.draft
    const arr = draft.tags.slice()
    const idx = arr.indexOf(tag)
    if (idx >= 0) arr.splice(idx, 1); else arr.push(tag)
    this.setData({ draft: Object.assign({}, draft, { tags: arr }) })
    this.syncPanelOptions()
  },
  onMinInput(e) { this.setData({ 'draft.minPrice': e.detail.value }) },
  onMaxInput(e) { this.setData({ 'draft.maxPrice': e.detail.value }) },
  toggleInStock() {
    this.setData({ 'draft.inStockOnly': !this.data.draft.inStockOnly })
    this.syncPanelOptions()
  },
  resetFilter() {
    const fresh = { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] }
    this.setData({ draft: fresh, applied: fresh, page: 1, sortKey: 'default', priceAsc: true })
    this.syncPanelOptions()
    this.applyFilters()
    toast.success('筛选已重置')
  },
  applyFilterPanel() {
    this.setData({ applied: JSON.parse(JSON.stringify(this.data.draft)), showFilterPanel: false, page: 1 })
    this.applyFilters()
    toast.success('筛选已应用，共 ' + this.data.resultCount + ' 件商品')
  },

  // ============ 分类切换：自动清空关键词并恢复完整列表 ============
  switchCategory(e) {
    const cat = e.currentTarget.dataset.cat
    if (cat === this.data.current) return
    this.setData({
      current: cat, kw: '', page: 1, sortKey: 'default', priceAsc: true,
      applied: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
      draft: { minPrice: '', maxPrice: '', inStockOnly: false, discountTypes: [], tags: [] },
      loading: true, showFilterPanel: false
    })
    setTimeout(() => this.applyFilters(), 120)
  },

  // ============ 分页（每页10条，上拉加载更多） ============
  onReachBottom() {
    if (!this.data.hasMore || this.data.loadingMore || this.data.loading) return
    this.setData({ loadingMore: true })
    const nextPage = this.data.page + 1
    this.setData({ page: nextPage })
    this.applyFilters()
  },

  onPullDownRefresh() {
    this.loadAll()
    setTimeout(() => wx.stopPullDownRefresh(), 600)
  },

  refreshCartBadge() {
    api.cart().then(cart => badge.setCartBadge(cart.reduce((s, x) => s + x.count, 0))).catch(() => {})
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  addCart(e) {
    const sku = e.currentTarget.dataset.sku
    api.addCart(sku, '标准装 · 1份', 1).then(() => {
      toast.success('加入购物车成功')
      this.refreshCartBadge()
    }).catch(err => toast.toast(err.message || '加入失败'))
  }
})
