// pages/search/search.js —— 搜索：历史 + 热门 + 实时联想 + 结果排序分页
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var imgBehavior = require('../../utils/imgBehavior.js')

Page({
  behaviors: [imgBehavior],
  data: {
    keyword: '',
    hotWords: [],
    history: [],
    suggest: [],
    searching: false,
    results: [],
    total: 0,
    page: 1,
    pageSize: 10,
    hasMore: true,
    sort: 'default', // default / price_asc / price_desc / sells
    loading: false
  },

  onLoad: function () {
    this.loadHot()
    this.loadHistory()
  },

  loadHot: function () {
    var that = this
    api.get('/api/hotwords').then(function (data) {
      that.setData({ hotWords: data.list })
    })
  },

  loadHistory: function () {
    this.setData({ history: wx.getStorageSync('search_history') || [] })
  },

  onInput: function (e) {
    var kw = e.detail.value.trim()
    this.setData({ keyword: kw })
    if (!kw) {
      this.setData({ suggest: [], searching: false, results: [] })
      return
    }
    // 实时联想（前缀+包含）
    var that = this
    clearTimeout(this._t)
    this._t = setTimeout(function () {
      api.get('/api/goods/list', { keyword: kw, page: 1, pageSize: 6, sort: 'sells' }).then(function (data) {
        that.setData({ suggest: data.list })
      })
    }, 250)
  },

  doSearch: function (kw) {
    var keyword = (kw !== undefined ? kw : this.data.keyword).trim()
    if (!keyword) {
      wx.showToast({ title: '请输入搜索关键词', icon: 'none' })
      return
    }
    // 保存历史
    var history = this.data.history.filter(function (h) { return h !== keyword })
    history.unshift(keyword)
    history = history.slice(0, 10)
    wx.setStorageSync('search_history', history)
    this.setData({ history: history, searching: true, keyword: keyword, suggest: [], sort: 'default' })
    this.loadResults(true)
  },

  tapHot: function (e) {
    this.doSearch(e.currentTarget.dataset.word)
  },

  tapSuggest: function (e) {
    this.doSearch(e.currentTarget.dataset.word || e.currentTarget.dataset.name)
  },

  loadResults: function (reset) {
    var that = this
    this.setData({ loading: true })
    api.get('/api/goods/list', {
      keyword: this.data.keyword,
      page: reset ? 1 : this.data.page,
      pageSize: this.data.pageSize,
      sort: this.data.sort
    }).then(function (data) {
      var results = reset ? data.list : that.data.results.concat(data.list)
      that.setData({
        results: results,
        total: data.total,
        page: reset ? 1 : that.data.page,
        hasMore: data.hasMore,
        loading: false
      })
    }).catch(function () { that.setData({ loading: false }) })
  },

  onReachBottom: function () {
    if (this.data.searching && this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadResults(false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadResults(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  setSort: function (e) {
    var sort = e.currentTarget.dataset.sort
    this.setData({ sort: sort, page: 1, results: [] })
    this.loadResults(true)
  },

  clearKeyword: function () {
    this.setData({ keyword: '', searching: false, results: [], suggest: [] })
    this.loadHistory()
  },

  removeHistory: function (e) {
    var word = e.currentTarget.dataset.word
    var history = this.data.history.filter(function (h) { return h !== word })
    wx.setStorageSync('search_history', history)
    this.setData({ history: history })
  },

  clearHistory: function () {
    var that = this
    wx.showModal({
      title: '提示', content: '确定清空搜索历史吗？',
      success: function (res) {
        if (res.confirm) {
          wx.setStorageSync('search_history', [])
          that.setData({ history: [] })
        }
      }
    })
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
  },

  backHome: function () {
    wx.navigateBack({ fail: function () { wx.switchTab({ url: '/pages/index/index' }) } })
  }
})
