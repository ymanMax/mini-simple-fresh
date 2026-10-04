// pages/category/index.js —— 商品分类：左导航 + 分类内搜索 + 吸顶排序栏 + 自定义筛选抽屉 + 分页
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var imgBehavior = require('../../utils/imgBehavior.js')

Page({
  behaviors: [imgBehavior],
  data: {
    categories: [],
    currentId: 1,
    currentName: '水果',
    goods: [],
    recommend: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    // 搜索
    keyword: '',
    // 排序：default / price_asc / price_desc / sells
    sort: 'default',
    // 筛选抽屉
    panelOpen: false,
    filters: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] },
    draft: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] },
    allTags: [],
    discountOptions: [],
    resultCount: 0,
    searching: false
  },

  onLoad: function () {
    Promise.all([
      api.get('/api/categories'),
      api.get('/api/goods/tags')
    ]).then(function (res) {
      this.setData({
        categories: res[0].list,
        allTags: res[1].tags,
        discountOptions: res[1].discountOptions
      })
      this.switchCategory(this.data.currentId, this.data.currentName)
    }.bind(this))
  },

  onShow: function () {
    badge.refreshAllBadges()
  },

  loadCategories: function () {
    var that = this
    api.get('/api/categories').then(function (data) {
      that.setData({ categories: data.list })
      that.switchCategory(that.data.currentId, that.data.currentName)
    })
  },

  // 切换分类：清空搜索/筛选/排序，恢复完整列表
  switchCategory: function (id, name) {
    this.setData({
      currentId: id,
      currentName: name,
      keyword: '',
      sort: 'default',
      filters: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] },
      draft: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] },
      page: 1,
      goods: [],
      loading: true,
      panelOpen: false
    })
    this.loadGoods(true)
  },

  onTapCat: function (e) {
    var id = Number(e.currentTarget.dataset.id)
    var name = e.currentTarget.dataset.name
    if (id === this.data.currentId) return
    this.switchCategory(id, name)
  },

  // ===== 分类内搜索（仅匹配当前分类）=====
  onSearchInput: function (e) {
    var kw = e.detail.value.trim()
    this.setData({ keyword: kw, searching: kw.length > 0 })
    clearTimeout(this._searchT)
    this._searchT = setTimeout(function () {
      this.loadGoods(true)
    }.bind(this), 250)
  },

  clearKeyword: function () {
    this.setData({ keyword: '', searching: false })
    this.loadGoods(true)
  },

  // ===== 排序（吸顶栏）=====
  tapSort: function (e) {
    var key = e.currentTarget.dataset.sort
    var cur = this.data.sort
    if (key === 'price') {
      // 价格：点击切换 从低到高 / 从高到低
      this.setData({ sort: cur === 'price_asc' ? 'price_desc' : 'price_asc' })
    } else {
      this.setData({ sort: key })
    }
    this.loadGoods(true)
  },

  // ===== 筛选抽屉 =====
  openPanel: function () {
    // 打开时把已应用筛选复制为草稿
    this.setData({
      panelOpen: true,
      draft: JSON.parse(JSON.stringify(this.data.filters))
    })
  },
  closePanel: function () {
    this.setData({ panelOpen: false })
  },
  stopProp: function () {},

  onPriceInput: function (e) {
    var field = e.currentTarget.dataset.field
    var draft = this.data.draft
    draft[field] = e.detail.value
    this.setData({ draft: draft })
  },

  toggleStock: function () {
    var draft = this.data.draft
    draft.inStockOnly = !draft.inStockOnly
    this.setData({ draft: draft })
  },

  toggleDiscount: function (e) {
    var key = e.currentTarget.dataset.key
    var draft = this.data.draft
    var arr = draft.discount
    var p = arr.indexOf(key)
    if (p >= 0) arr.splice(p, 1)
    else arr.push(key)
    this.setData({ draft: draft })
  },

  toggleTag: function (e) {
    var tag = e.currentTarget.dataset.tag
    var draft = this.data.draft
    var arr = draft.tags
    var p = arr.indexOf(tag)
    if (p >= 0) arr.splice(p, 1)
    else arr.push(tag)
    this.setData({ draft: draft })
  },

  resetFilters: function () {
    this.setData({
      draft: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] }
    })
  },

  confirmFilters: function () {
    // 应用筛选：元 → 分，关闭抽屉，重置分页并加载（返回 total 显示结果数）
    this.setData({
      filters: JSON.parse(JSON.stringify(this.data.draft)),
      panelOpen: false,
      page: 1
    })
    this.loadGoods(true)
  },

  // ===== 取数：搜索 + 排序 + 筛选 可叠加 =====
  buildQuery: function (page) {
    var f = this.data.filters
    var query = {
      categoryId: this.data.currentId,
      page: page,
      pageSize: this.data.pageSize,
      sort: this.data.sort
    }
    if (this.data.keyword) query.keyword = this.data.keyword
    // 价格区间（元 → 分，支持单边）
    if (f.minPrice !== '' && !isNaN(Number(f.minPrice))) query.minPrice = Math.round(Number(f.minPrice) * 100)
    if (f.maxPrice !== '' && !isNaN(Number(f.maxPrice))) query.maxPrice = Math.round(Number(f.maxPrice) * 100)
    if (f.inStockOnly) query.inStockOnly = 1
    if (f.discount.length) query.discount = f.discount.join(',')
    if (f.tags.length) query.tags = f.tags.join(',')
    return query
  },

  loadGoods: function (reset) {
    var that = this
    this.setData({ loading: true })
    var page = reset ? 1 : this.data.page
    api.get('/api/goods/list', this.buildQuery(page)).then(function (data) {
      var list = reset ? data.list : that.data.goods.concat(data.list)
      that.setData({
        goods: list,
        recommend: reset ? data.recommend : that.data.recommend,
        page: page,
        hasMore: data.hasMore,
        resultCount: data.total,
        loading: false
      })
    }).catch(function () {
      that.setData({ loading: false })
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadGoods(false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadGoods(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 800)
  },

  clearAllAndReload: function () {
    this.setData({
      keyword: '',
      sort: 'default',
      filters: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] },
      draft: { minPrice: '', maxPrice: '', inStockOnly: false, discount: [], tags: [] }
    })
    this.loadGoods(true)
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  addCart: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/cart/add', { goodsId: id, specLabel: '标准装', count: 1 }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
    })
  }
})
