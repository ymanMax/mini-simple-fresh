// pages/search/search.js
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    keyword: '',
    hotWords: [],
    history: [],
    allGoods: [],
    // 联想
    suggest: [],
    // 结果
    results: [],
    page: 1,
    pageSize: 10,
    hasMore: false,
    searching: false,
    sort: 'default', // default / priceAsc / priceDesc / sales
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function () {
    var that = this
    api.hotWords().then(function (res) {
      that.setData({ hotWords: (res && res.data) || [] })
    })
    api.getGoods({ page: 1, pageSize: 100 }).then(function (res) {
      var list = (res && res.list) || []
      list = list.map(function (g) {
        return Object.assign({}, g, {
          priceYuan: F.fen2yuan(g.minPrice),
          originalYuan: F.fen2yuan(g.originalPrice),
          salesText: g.salesVolume > 10000 ? (g.salesVolume / 10000).toFixed(1) + '万' : g.salesVolume + ''
        })
      })
      that.allGoods = list
    })
    this.setData({ history: wx.getStorageSync('search_history') || [] })
  },

  onInput: function (e) {
    var kw = e.detail.value.trim()
    this.setData({ keyword: kw })
    this.buildSuggest(kw)
  },

  buildSuggest: function (kw) {
    if (!kw || !this.allGoods) { this.setData({ suggest: [] }); return }
    var lower = kw.toLowerCase()
    var sug = this.allGoods.filter(function (g) {
      return g.name.toLowerCase().indexOf(lower) >= 0
    }).slice(0, 8)
    this.setData({ suggest: sug })
  },

  // 触发搜索
  doSearch: function (kw) {
    kw = (kw !== undefined ? kw : this.data.keyword).trim()
    if (!kw) { toast.toast('请输入搜索关键词'); return }
    // 保存历史
    var history = this.data.history.filter(function (h) { return h !== kw })
    history.unshift(kw)
    if (history.length > 12) history = history.slice(0, 12)
    wx.setStorageSync('search_history', history)
    this.setData({ history: history, keyword: kw, suggest: [] })
    this.runSearch(kw, this.data.sort, 1, true)
  },

  onSearchConfirm: function (e) {
    this.doSearch(e.detail.value)
  },

  tapHot: function (e) {
    this.doSearch(e.currentTarget.dataset.word)
  },

  tapHistory: function (e) {
    this.doSearch(e.currentTarget.dataset.word)
  },

  runSearch: function (kw, sort, page, reset) {
    var that = this
    var list = this.allGoods.filter(function (g) {
      var k = kw.toLowerCase()
      return g.name.toLowerCase().indexOf(k) >= 0 ||
        g.subtitle.toLowerCase().indexOf(k) >= 0 ||
        g.categoryName.indexOf(kw) >= 0
    })
    // 排序
    if (sort === 'priceAsc') list.sort(function (a, b) { return a.minPrice - b.minPrice })
    else if (sort === 'priceDesc') list.sort(function (a, b) { return b.minPrice - a.minPrice })
    else if (sort === 'sales') list.sort(function (a, b) { return b.salesVolume - a.salesVolume })

    var start = (page - 1) * this.data.pageSize
    var pageList = list.slice(start, start + this.data.pageSize)
    this.setData({
      results: reset ? pageList : this.data.results.concat(pageList),
      total: list.length,
      page: page,
      hasMore: start + this.data.pageSize < list.length,
      searching: true,
      sort: sort
    })
  },

  setSort: function (e) {
    var sort = e.currentTarget.dataset.sort
    this.runSearch(this.data.keyword, sort, 1, true)
  },

  onReachBottom: function () {
    if (!this.data.hasMore || !this.data.searching) return
    this.runSearch(this.data.keyword, this.data.sort, this.data.page + 1, false)
  },

  onPullDownRefresh: function () {
    if (this.data.searching) this.runSearch(this.data.keyword, this.data.sort, 1, true)
    wx.stopPullDownRefresh()
  },

  clearHistory: function () {
    wx.removeStorageSync('search_history')
    this.setData({ history: [] })
  },

  removeHistory: function (e) {
    var w = e.currentTarget.dataset.word
    var history = this.data.history.filter(function (h) { return h !== w })
    wx.setStorageSync('search_history', history)
    this.setData({ history: history })
  },

  cancelSearch: function () {
    this.setData({ keyword: '', suggest: [], searching: false, results: [] })
  },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  onImgError: function (e) { img.make(this)(e) }
})
