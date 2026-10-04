// pages/category/index.js 商品分类 + 搜索 + 排序 + 自定义筛选
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

// 优惠类型选项
var PROMO_OPTIONS = ['会员价', '促销直降']
// 商品标签选项
var TAG_OPTIONS = ['顺丰包邮', '产地直发', '当季现摘', '坏果包赔', '冷链配送', '当日达', '进口直供', '有机认证', '包邮']

Page({
  data: {
    categories: [],
    currentCatId: 1,
    currentName: '水果',
    allGoods: [],
    products: [],
    recommend: [],
    resultList: [],
    resultCount: 0,
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    cartCount: 0,

    // 搜索
    keyword: '',
    // 排序：default / priceAsc / priceDesc / sales
    sort: 'default',
    // 筛选面板
    filterShow: false,
    priceMin: '',
    priceMax: '',
    inStockOnly: false,
    promoTypes: [],
    productTags: [],
    // 已应用筛选
    appliedFilter: null,

    promoOptions: PROMO_OPTIONS,
    tagOptions: TAG_OPTIONS,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    var cat = options.cat ? Number(options.cat) : 1
    this.setData({ currentCatId: cat })
    this.loadAll()
  },

  onShow: function () {
    this.refreshCartBadge()
  },

  loadAll: function () {
    var that = this
    this.setData({ loading: true })
    api.getGoods({ page: 1, pageSize: 100 }).then(function (res) {
      var list = (res && res.list) || []
      list = list.map(function (g) {
        return Object.assign({}, g, {
          priceYuan: F.fen2yuan(g.minPrice),
          originalYuan: F.fen2yuan(g.originalPrice),
          salesText: g.salesVolume > 10000 ? (g.salesVolume / 10000).toFixed(1) + '万' : g.salesVolume + ''
        })
      })
      // 分类统计
      var catMap = {}
      var catList = []
      var cats = ['水果', '蔬菜', '肉类', '水产', '乳品', '零食', '饮品', '日用']
      cats.forEach(function (name, i) {
        var goods = list.filter(function (g) { return g.categoryName === name })
        catMap[name] = goods
        catList.push({ id: i + 1, name: name, count: goods.length })
      })
      that.allGoodsMap = catMap
      that.setData({ categories: catList, allGoods: list, loading: false })
      that.switchCategory(that.data.currentCatId, true)
    })
  },

  // 切换分类：清空搜索词、排序、筛选，恢复完整列表
  switchCategory: function (catId, keepLoading) {
    catId = Number(catId)
    var name = this.data.categories.filter(function (c) { return c.id === catId })[0]
    name = name ? name.name : '水果'
    var goods = this.allGoodsMap[name] || []
    var recommend = goods.slice(0, 3)
    this.setData({
      currentCatId: catId,
      currentName: name,
      recommend: recommend,
      keyword: '',
      sort: 'default',
      appliedFilter: null,
      priceMin: '',
      priceMax: '',
      inStockOnly: false,
      promoTypes: [],
      productTags: [],
      filterShow: false,
      page: 1
    })
    this.recompute()
  },

  onTapCategory: function (e) {
    this.switchCategory(e.currentTarget.dataset.id)
  },

  // ============ 搜索 ============
  onInputKeyword: function (e) {
    this.setData({ keyword: e.detail.value, page: 1 })
    this.recompute()
  },

  clearKeyword: function () {
    this.setData({ keyword: '', page: 1 })
    this.recompute()
  },

  cancelSearch: function () {
    this.setData({ keyword: '', page: 1 })
    this.recompute()
  },

  // ============ 排序 ============
  setSort: function (e) {
    var key = e.currentTarget.dataset.sort
    var next = key
    if (key === 'priceAsc') {
      // 价格：点击切换升/降
      next = this.data.sort === 'priceAsc' ? 'priceDesc' : 'priceAsc'
    }
    this.setData({ sort: next, page: 1 })
    this.recompute()
  },

  // ============ 筛选面板 ============
  openFilter: function () {
    // 打开时把已应用筛选回填到草稿
    var f = this.data.appliedFilter
    this.setData({
      filterShow: true,
      priceMin: f ? f.priceMinYuan : '',
      priceMax: f ? f.priceMaxYuan : '',
      inStockOnly: f ? f.inStockOnly : false,
      promoTypes: f ? f.promoTypes.slice() : [],
      productTags: f ? f.productTags.slice() : []
    })
  },

  closeFilter: function () {
    this.setData({ filterShow: false })
  },

  onPriceMinInput: function (e) {
    this.setData({ priceMin: e.detail.value })
  },
  onPriceMaxInput: function (e) {
    this.setData({ priceMax: e.detail.value })
  },

  toggleInStock: function () {
    this.setData({ inStockOnly: !this.data.inStockOnly })
  },

  togglePromo: function (e) {
    var tag = e.currentTarget.dataset.tag
    var arr = this.data.promoTypes.slice()
    var idx = arr.indexOf(tag)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(tag)
    this.setData({ promoTypes: arr })
  },

  toggleProductTag: function (e) {
    var tag = e.currentTarget.dataset.tag
    var arr = this.data.productTags.slice()
    var idx = arr.indexOf(tag)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(tag)
    this.setData({ productTags: arr })
  },

  resetFilter: function () {
    this.setData({
      priceMin: '',
      priceMax: '',
      inStockOnly: false,
      promoTypes: [],
      productTags: []
    })
  },

  confirmFilter: function () {
    var minYuan = parseFloat(this.data.priceMin)
    var maxYuan = parseFloat(this.data.priceMax)
    var applied = {
      priceMinFen: isNaN(minYuan) ? 0 : Math.round(minYuan * 100),
      priceMaxFen: isNaN(maxYuan) ? 0 : Math.round(maxYuan * 100),
      priceMinYuan: this.data.priceMin,
      priceMaxYuan: this.data.priceMax,
      inStockOnly: this.data.inStockOnly,
      promoTypes: this.data.promoTypes.slice(),
      productTags: this.data.productTags.slice()
    }
    this.setData({ appliedFilter: applied, filterShow: false, page: 1 })
    this.recompute()
    toast.toast('共 ' + this.data.resultCount + ' 件商品')
  },

  // ============ 核心：搜索 + 筛选 + 排序 叠加，分页 ============
  recompute: function () {
    var catGoods = this.allGoodsMap[this.data.currentName] || []
    var kw = (this.data.keyword || '').trim().toLowerCase()

    var list = catGoods.filter(function (g) {
      if (!kw) return true
      return g.name.toLowerCase().indexOf(kw) >= 0 || g.subtitle.toLowerCase().indexOf(kw) >= 0
    })

    // 已应用筛选
    var f = this.data.appliedFilter
    if (f) {
      if (f.priceMinFen > 0) list = list.filter(function (g) { return g.minPrice >= f.priceMinFen })
      if (f.priceMaxFen > 0) list = list.filter(function (g) { return g.minPrice <= f.priceMaxFen })
      if (f.inStockOnly) list = list.filter(function (g) { return g.stock > 0 })
      if (f.promoTypes && f.promoTypes.length) {
        list = list.filter(function (g) {
          return f.promoTypes.some(function (pt) {
            if (pt === '会员价') return g.memberPrice && g.memberPrice < g.minPrice
            if (pt === '促销直降') return g.originalPrice > g.minPrice
            return true
          })
        })
      }
      if (f.productTags && f.productTags.length) {
        list = list.filter(function (g) {
          return f.productTags.some(function (t) { return (g.tags || []).indexOf(t) >= 0 })
        })
      }
    }

    // 排序
    var sort = this.data.sort
    list = list.slice()
    if (sort === 'priceAsc') list.sort(function (a, b) { return a.minPrice - b.minPrice })
    else if (sort === 'priceDesc') list.sort(function (a, b) { return b.minPrice - a.minPrice })
    else if (sort === 'sales') list.sort(function (a, b) { return b.salesVolume - a.salesVolume })

    // 分页：第1页替换（搜索/排序/筛选/切换分类重置），后续页追加（上拉加载）
    var page = this.data.page
    var ps = this.data.pageSize
    var start = (page - 1) * ps
    var pageSlice = list.slice(start, start + ps)
    var products = page === 1 ? pageSlice : this.data.products.concat(pageSlice)
    this.setData({
      resultList: list,
      products: products,
      resultCount: list.length,
      hasMore: start + ps < list.length
    })
  },

  onReachBottom: function () {
    if (!this.data.hasMore || this.data.loading) return
    var next = this.data.page + 1
    this.setData({ page: next })
    this.recompute()
  },

  onPullDownRefresh: function () {
    this.loadAll()
    wx.stopPullDownRefresh()
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  addToCart: function (e) {
    var id = e.currentTarget.dataset.id
    var g = null
    var goods = this.allGoodsMap[this.data.currentName] || []
    for (var i = 0; i < goods.length; i++) if (goods[i].id === id) { g = goods[i]; break }
    if (!g) return
    api.addToCart({
      goodsId: g.id, name: g.name, pic: g.pic,
      specText: '标准装', price: g.minPrice, count: 1
    }).then(function (res) {
      if (res.ok) toast.success('加入购物车成功')
      else toast.toast(res.msg || '加入购物车失败')
    })
    this.refreshCartBadge()
  },

  refreshCartBadge: function () {
    var that = this
    api.getCart().then(function (cart) {
      var count = 0
      ;(cart || []).forEach(function (c) { count += c.count })
      that.setData({ cartCount: count })
      if (count > 0) wx.setTabBarBadge({ index: 2, text: '' + count })
      else wx.removeTabBarBadge({ index: 2 })
    })
  },

  onImgError: function (e) { img.make(this)(e) }
})
