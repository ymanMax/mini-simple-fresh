// pages/message/index.js —— 消息中心（需求10）：分类Tab/分页/全部已读/关联跳转/延迟推送
var api = require('../../utils/api.js')
var badge = require('../../utils/badge.js')

var TABS = [
  { key: 'all', name: '全部', type: 0 },
  { key: '2', name: '订单', type: 2 },
  { key: '3', name: '促销', type: 3 },
  { key: '1', name: '系统', type: 1 }
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'all',
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    unread: 0
  },

  onLoad: function () {
    var that = this
    // mock 延迟推送：进入 3 秒后 push 一条抢购提醒
    this._pushTimer = setTimeout(function () {
      api.post('/api/messages/pushDemo', {}).then(function () {
        that.loadList(true)
      })
    }, 3000)
  },

  onUnload: function () {
    if (this._pushTimer) clearTimeout(this._pushTimer)
  },

  onShow: function () {
    this.loadList(true)
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key, page: 1, list: [] })
    this.loadList(true)
  },

  loadList: function (reset) {
    var that = this
    this.setData({ loading: true })
    var query = { page: reset ? 1 : this.data.page, pageSize: this.data.pageSize }
    if (this.data.activeTab !== 'all') query.type = this.data.activeTab
    api.get('/api/messages/list', query).then(function (data) {
      var list = reset ? data.list : that.data.list.concat(data.list)
      that.setData({
        list: list,
        hasMore: data.hasMore,
        unread: data.unread,
        loading: false,
        page: reset ? 1 : that.data.page
      })
      badge.refreshMessageBadge()
    }).catch(function () { that.setData({ loading: false }) })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadList(false)
    }
  },

  onPullDownRefresh: function () {
    var that = this
    this.loadList(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 800)
  },

  readAll: function () {
    var that = this
    api.post('/api/messages/readAll', {}).then(function () {
      that.loadList(true)
    })
  },

  tapMessage: function (e) {
    var item = e.currentTarget.dataset.item
    // 标记已读
    api.post('/api/messages/readOne', { id: item.id })
    // 更新本地
    var list = this.data.list.map(function (m) {
      if (m.id === item.id) m.isRead = true
      return m
    })
    this.setData({ list: list, unread: Math.max(0, this.data.unread - 1) })
    // 关联跳转
    if (item.relatedId && typeof item.relatedId === 'number') {
      wx.navigateTo({ url: '/pages/order/detail?id=' + item.relatedId })
    } else if (item.relatedId && item.relatedId.page) {
      if (item.relatedId.page === 'promotion') {
        wx.navigateTo({ url: '/pages/promotion/index?tab=' + (item.relatedId.tab || 'seckill') })
      } else if (item.relatedId.page === 'coupon') {
        wx.navigateTo({ url: '/pages/coupon/index?tab=' + (item.relatedId.tab || '1') })
      }
    } else {
      wx.showModal({ title: item.title, content: item.content, showCancel: false, confirmColor: '#e93b3d' })
    }
  }
})
