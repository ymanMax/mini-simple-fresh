// pages/category/index.js —— 商品分类：左侧8分类（数量统计）+ 分类内搜索 + 吸顶排序 + 自定义筛选抽屉 + 客户端分页 + 推荐 + 加购
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    categories: [],
    currentCategory: 'fruit',
    currentName: '水果',
    // 当前分类全量商品（客户端筛选/排序/分页）
    allProducts: [],
    products: [],          // 当前页结果（渲染）
    recommend: [],
    page: 1,
    pageSize: 10,
    total: 0,
    noMore: false,
    cartCount: 0,
    // 1. 分类内搜索
    keyword: '',
    // 2. 排序：default综合 / priceAsc / priceDesc / sales
    sort: 'default',
    // 3. 自定义筛选抽屉
    filterOpen: false,
    priceMin: '',      // 元（输入）
    priceMax: '',
    inStockOnly: false,
    discountTags: [],  // 优惠类型：会员价 / 促销直降
    tagFilters: [],     // 商品标签多选
    availableTags: [], // 当前分类全部标签
    availableDiscounts: ['会员价', '促销直降'],
    filterCount: 0,
    resultCount: 0,
    tagList: [],        // 标签胶囊（含selected标记）
    discountList: [],   // 优惠类型胶囊（含selected标记）
    sortArrow: '⇅'      // 排序箭头（预计算）
  },

  // 胶囊列表预计算（WXML不支持方法调用，selected标记由JS注入）
  syncCapsules: function () {
    var that = this
    var tagList = this.data.availableTags.map(function (t) { return { name: t, selected: that.data.tagFilters.indexOf(t) >= 0 } })
    var discountList = this.data.availableDiscounts.map(function (t) { return { name: t, selected: that.data.discountTags.indexOf(t) >= 0 } })
    this.setData({ tagList: tagList, discountList: discountList })
  },

  onLoad: function () { this.loadCategories() },

  onShow: function () {
    this.setData({ cartCount: api.cartCount() })
    mixin.updateTabBadge.call(this)
  },

  loadCategories: function () {
    var that = this
    this.setData({ loading: true })
    api.getCategories().then(function (list) {
      that.setData({ categories: list, loading: false })
      that.loadCategoryProducts()
      that.loadRecommend()
    })
  },

  // 拉取当前分类全量商品（一次取100条，客户端筛选/排序/分页）
  loadCategoryProducts: function () {
    var that = this
    api.getProducts({ categoryId: this.data.currentCategory, page: 1, pageSize: 100, sort: 'sales' }).then(function (res) {
      var all = res.list
      // 收集当前分类的全部标签（用于筛选胶囊）
      var tagSet = {}
      all.forEach(function (g) { (g.tags || []).forEach(function (t) { tagSet[t] = true }) })
      that.setData({ allProducts: all, availableTags: Object.keys(tagSet), loading: false })
      that.syncCapsules()
      that.applyFilters(true)
    })
  },

  loadRecommend: function () {
    var that = this
    api.getProducts({ categoryId: this.data.currentCategory, page: 1, pageSize: 3, sort: 'sales' }).then(function (res) {
      that.setData({ recommend: res.list })
    })
  },

  // ---------------- 1. 分类内搜索（仅对当前选中分类模糊匹配名称/副标题） ----------------
  onInput: function (e) {
    this.setData({ keyword: e.detail.value.trim() })
    this.applyFilters(true)
  },
  clearKeyword: function () { this.setData({ keyword: '' }); this.applyFilters(true) },
  cancelSearch: function () { this.setData({ keyword: '' }); this.applyFilters(true) },

  // 切换分类：自动清空关键词并恢复该分类完整列表（需求1）
  switchCategory: function (e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name
    this.setData({
      currentCategory: id, currentName: name,
      keyword: '', sort: 'default',
      priceMin: '', priceMax: '', inStockOnly: false,
      discountTags: [], tagFilters: [], filterOpen: false,
      page: 1, noMore: false
    })
    this.loadCategoryProducts()
    this.loadRecommend()
  },

  // ---------------- 2. 排序（综合/价格升降/销量） ----------------
  chooseSort: function (e) {
    var sort = e.currentTarget.dataset.sort
    // 价格：点击切换升↔降
    if (sort === 'price') {
      sort = this.data.sort === 'priceAsc' ? 'priceDesc' : 'priceAsc'
    }
    var arrow = sort === 'priceAsc' ? '↑' : sort === 'priceDesc' ? '↓' : '⇅'
    this.setData({ sort: sort, sortArrow: arrow, page: 1 })
    this.applyFilters(true)
  },

  // ---------------- 3. 自定义筛选抽屉 ----------------
  openFilter: function () { this.setData({ filterOpen: true }) },
  closeFilter: function () { this.setData({ filterOpen: false }) },

  onPriceMinInput: function (e) { this.setData({ priceMin: e.detail.value }) },
  onPriceMaxInput: function (e) { this.setData({ priceMax: e.detail.value }) },
  toggleInStock: function () { this.setData({ inStockOnly: !this.data.inStockOnly }) },

  // 优惠类型多选：会员价（vipPrice < price）/ 促销直降（price < originalPrice）
  toggleDiscount: function (e) {
    var tag = e.currentTarget.dataset.tag
    var arr = this.data.discountTags.slice()
    if (arr.indexOf(tag) >= 0) arr.splice(arr.indexOf(tag), 1)
    else arr.push(tag)
    this.setData({ discountTags: arr })
    this.syncCapsules()
  },

  // 商品标签多选（按 product_tags 匹配）
  toggleProductTag: function (e) {
    var tag = e.currentTarget.dataset.tag
    var arr = this.data.tagFilters.slice()
    if (arr.indexOf(tag) >= 0) arr.splice(arr.indexOf(tag), 1)
    else arr.push(tag)
    this.setData({ tagFilters: arr })
    this.syncCapsules()
  },

  // 重置：清空全部筛选条件
  resetFilters: function () {
    this.setData({
      priceMin: '', priceMax: '', inStockOnly: false,
      discountTags: [], tagFilters: [], sort: 'default'
    })
    this.syncCapsules()
    this.applyFilters(true)
  },

  // 确定：应用筛选，展示结果数（如"共12件商品"）
  applyFilterPanel: function () {
    this.setData({ filterOpen: false, page: 1 })
    this.applyFilters(true)
    var n = this.data.resultCount
    wx.showToast({ title: '共 ' + n + ' 件商品', icon: 'none' })
  },

  // ---------------- 搜索 + 排序 + 筛选叠加，客户端分页（每页10条） ----------------
  applyFilters: function (reset) {
    var that = this
    var keyword = this.data.keyword
    var sort = this.data.sort
    var minFen = this.data.priceMin !== '' ? Math.round(parseFloat(this.data.priceMin) * 100) : null
    var maxFen = this.data.priceMax !== '' ? Math.round(parseFloat(this.data.priceMax) * 100) : null

    var list = this.data.allProducts.slice()

    // 搜索：名称/副标题模糊匹配（仅当前分类）
    if (keyword) {
      var kw = keyword.toLowerCase()
      list = list.filter(function (g) {
        return g.name.toLowerCase().indexOf(kw) >= 0 || (g.subtitle || '').toLowerCase().indexOf(kw) >= 0
      })
    }
    // 价格区间（单位元→分，支持单边）
    if (minFen !== null) list = list.filter(function (g) { return g.price >= minFen })
    if (maxFen !== null) list = list.filter(function (g) { return g.price <= maxFen })
    // 仅看有货
    if (this.data.inStockOnly) list = list.filter(function (g) { return g.stock > 0 })
    // 优惠类型
    if (this.data.discountTags.length) {
      list = list.filter(function (g) {
        if (that.data.discountTags.indexOf('会员价') >= 0 && !(g.vipPrice && g.vipPrice < g.price)) return false
        if (that.data.discountTags.indexOf('促销直降') >= 0 && !(g.price < g.originalPrice)) return false
        return true
      })
    }
    // 商品标签（product_tags）
    if (this.data.tagFilters.length) {
      list = list.filter(function (g) {
        var tags = g.tags || []
        return that.data.tagFilters.every(function (t) { return tags.indexOf(t) >= 0 })
      })
    }

    // 排序
    if (sort === 'priceAsc') list.sort(function (a, b) { return a.price - b.price })
    else if (sort === 'priceDesc') list.sort(function (a, b) { return b.price - a.price })
    else if (sort === 'sales') list.sort(function (a, b) { return b.numberSells - a.numberSells })
    else list.sort(function (a, b) { return b.hotScore - a.hotScore }) // 综合（销量/热度）

    // 客户端分页：每页10条
    var page = reset ? 1 : this.data.page
    var pageSize = this.data.pageSize
    var total = list.length
    var paged = list.slice(0, page * pageSize)
    this.setData({
      products: paged, total: total, resultCount: total,
      noMore: paged.length >= total,
      filterCount: this.data.discountTags.length + this.data.tagFilters.length + (this.data.inStockOnly ? 1 : 0) + (minFen !== null || maxFen !== null ? 1 : 0)
    })
  },

  // 上拉加载更多 / 点击"加载更多"（客户端分页追加，每页10条）
  onReachBottom: function () { this.loadMore() },
  loadMore: function () {
    if (this.data.noMore || this.data.loading) return
    this.setData({ page: this.data.page + 1 })
    this.applyFilters(false)
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadCategoryProducts()
    this.loadRecommend()
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  addCart: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.addToCart(id, '标准装 · 常规包装', 1).then(function (res) {
      if (res.success) {
        wx.showToast({ title: '加入购物车成功', icon: 'none' })
        that.setData({ cartCount: api.cartCount() })
        mixin.updateTabBadge.call(that)
      }
    })
  },

  goSearch: mixin.goSearch,

  onImgError: mixin.onImgError
})
