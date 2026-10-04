// pages/search/search.js —— 搜索：搜索框、历史、热门词、实时联想、结果列表、排序、分页
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    keyword: '',
    history: [],
    hotWords: [],
    suggestions: [],     // 实时联想商品
    results: [],         // 搜索结果
    searched: false,
    sort: 'default',     // default | priceAsc | priceDesc | sales
    page: 1,
    total: 0,
    pageSize: 10,
    noMore: false
  },

  onLoad: function () {
    var that = this
    this.setData({ loading: true })
    api.getSearchInit().then(function (res) {
      that.setData({ hotWords: res.hotWords, history: res.history, recommend: res.products || [], loading: false })
    })
  },

  clearSearch: function () {
    this.setData({ keyword: '', suggestions: [], searched: false, results: [] })
  },

  // 输入关键词：实时联想（前缀匹配）
  onInput: function (e) {
    var kw = e.detail.value.trim()
    this.setData({ keyword: kw })
    if (!kw) { this.setData({ suggestions: [], searched: false }); return }
    var that = this
    api.getProducts({ keyword: kw, page: 1, pageSize: 6, sort: 'default' }).then(function (res) {
      // 仅展示联想：名称前缀匹配优先
      var prefix = res.list.filter(function (g) { return g.name.indexOf(kw) === 0 || g.subtitle.indexOf(kw) === 0 })
      var rest = res.list.filter(function (g) { return prefix.indexOf(g) < 0 })
      that.setData({ suggestions: prefix.concat(rest).slice(0, 6) })
    })
  },

  // 点击搜索 / 回车：执行搜索，保存历史
  doSearch: function (kw) {
    var keyword = (kw || this.data.keyword).trim()
    if (!keyword) { wx.showToast({ title: '请输入关键词', icon: 'none' }); return }
    api.saveHistory(keyword)
    this.setData({ keyword: keyword, searched: true, page: 1, results: [], noMore: false })
    this.loadResults(true)
  },

  tapHot: function (e) { this.doSearch(e.currentTarget.dataset.id) },
  tapSuggestion: function (e) { this.doSearch(e.currentTarget.dataset.kw) },

  // 排序
  changeSort: function (e) {
    var sort = e.currentTarget.dataset.sort
    this.setData({ sort: sort, page: 1, results: [], noMore: false })
    this.loadResults(true)
  },

  loadResults: function (reset) {
    var that = this
    var page = reset ? 1 : this.data.page + 1
    api.getProducts({ keyword: this.data.keyword, page: page, pageSize: this.data.pageSize, sort: this.data.sort }).then(function (res) {
      var list = reset ? res.list : that.data.results.concat(res.list)
      that.setData({
        results: list, page: res.page, total: res.total,
        noMore: list.length >= res.total
      })
    })
  },

  onReachBottom: function () {
    if (!this.data.noMore && this.data.searched) this.loadResults(false)
  },
  onPullDownRefresh: function () {
    if (this.data.searched) this.loadResults(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  // 删除单条历史
  removeHistory: function (e) {
    var kw = e.currentTarget.dataset.kw
    var that = this
    api.removeHistoryWord(kw).then(function (history) { that.setData({ history: history }) })
  },

  clearHistory: function () {
    var that = this
    api.clearHistory().then(function () { that.setData({ history: [] }) })
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  addCart: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.addToCart(id, '标准装 · 常规包装', 1).then(function (res) {
      if (res.success) { wx.showToast({ title: '加入购物车成功', icon: 'none' }); mixin.updateTabBadge.call(that) }
    })
  },

  back: function () { wx.navigateBack() },

  onImgError: mixin.onImgError
})
