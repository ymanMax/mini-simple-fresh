const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')
const dec = require('../../utils/decorate.js')

Page({
  data: {
    kw: '', hotWords: [], history: [],
    suggest: [], results: [],
    mode: 'home', // home | result
    sort: 'default',
    page: 1, hasMore: true, loading: false, loadingMore: false
  },

  onLoad() {
    api.hotWords().then(h => this.setData({ hotWords: h })).catch(() => {})
    const hist = wx.getStorageSync('fl_search_history')
    this.setData({ history: Array.isArray(hist) ? hist : [] })
  },

  onShow() { this.refreshCartBadge() },
  refreshCartBadge() {
    api.cart().then(c => badge.setCartBadge(c.reduce((s, x) => s + x.count, 0))).catch(() => {})
  },

  onInput(e) {
    const kw = e.detail.value.trim()
    this.setData({ kw: kw })
    if (!kw) { this.setData({ suggest: [], mode: 'home' }); return }
    api.suggest(kw).then(list => this.setData({ suggest: list.map(dec.goods) })).catch(() => {})
  },

  clearKw() {
    this.setData({ kw: '', suggest: [], mode: 'home' })
  },

  // 执行搜索
  doSearch(kw) {
    kw = (kw || this.data.kw).trim()
    if (!kw) { toast.toast('请输入搜索关键词'); return }
    const history = [kw].concat(this.data.history.filter(h => h !== kw)).slice(0, 10)
    wx.setStorageSync('fl_search_history', history)
    this.setData({ history: history, kw: kw, mode: 'result', sort: 'default' })
    this.loadResults(1, 'default')
  },
  onSearchConfirm() { this.doSearch() },

  hotTap(e) { this.doSearch(e.currentTarget.dataset.kw) },
  suggestTap(e) { this.doSearch(e.currentTarget.dataset.kw) },

  clearHistory() {
    wx.setStorageSync('fl_search_history', [])
    this.setData({ history: [] })
  },
  removeHistory(e) {
    const kw = e.currentTarget.dataset.kw
    const history = this.data.history.filter(h => h !== kw)
    wx.setStorageSync('fl_search_history', history)
    this.setData({ history: history })
  },

  setSort(e) {
    const sort = e.currentTarget.dataset.sort
    this.setData({ sort: sort })
    this.loadResults(1, sort)
  },

  loadResults(page, sort) {
    this.setData({ loading: page === 1, loadingMore: page > 1 })
    api.searchResults({ q: this.data.kw, sort: sort || this.data.sort, page: page }).then(res => {
      const items = res.list.map(dec.goods)
      const list = page === 1 ? items : this.data.results.concat(items)
      this.setData({ results: list, page: page, hasMore: res.hasMore, loading: false, loadingMore: false })
    }).catch(() => { this.setData({ loading: false, loadingMore: false }) })
  },

  onReachBottom() {
    if (this.data.mode === 'result' && this.data.hasMore && !this.data.loadingMore) this.loadResults(this.data.page + 1)
  },
  onPullDownRefresh() {
    if (this.data.mode === 'result') this.loadResults(1)
    wx.stopPullDownRefresh()
  },

  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  addCart(e) {
    const sku = e.currentTarget.dataset.sku
    api.addCart(sku, '标准装 · 1份', 1).then(() => { toast.success('加入购物车成功'); this.refreshCartBadge() })
      .catch(err => toast.toast(err.message || '加入失败'))
  }
})
