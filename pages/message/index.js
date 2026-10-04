// pages/message/index.js 消息中心
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    tabs: [
      { key: 0, name: '全部' },
      { key: 2, name: '订单' },
      { key: 3, name: '促销' },
      { key: 1, name: '系统' }
    ],
    activeTab: 0,
    messages: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    loading: true,
    unread: 0,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function () {
    this.load(1, true)
    // mock 延迟推送：3秒后推送一条限时抢购提醒
    var that = this
    setTimeout(function () {
      api.pushSeckillReminder().then(function () {
        that.load(that.data.page, true)
      })
    }, 3000)
  },

  onShow: function () {
    this.load(1, true)
  },

  relTime: function (ts) {
    var diff = Date.now() - ts
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 2 * 86400000) return '昨天'
    return F.formatDate(ts)
  },

  load: function (page, reset) {
    var that = this
    this.setData({ loading: true })
    api.getMessages().then(function (list) {
      list = list || []
      // 类型筛选
      if (that.data.activeTab !== 0) {
        list = list.filter(function (m) { return m.type === that.data.activeTab })
      }
      list = list.map(function (m) {
        return Object.assign({}, m, { relTime: that.relTime(m.createTime) })
      })
      var pageSize = that.data.pageSize
      var start = (page - 1) * pageSize
      var pageList = list.slice(start, start + pageSize)
      var unread = list.filter(function (m) { return !m.isRead }).length
      that.setData({
        messages: reset ? pageList : that.data.messages.concat(pageList),
        total: list.length,
        page: page,
        hasMore: start + pageSize < list.length,
        loading: false,
        unread: unread
      })
      // TabBar 未读角标
      if (unread > 0) wx.setTabBarBadge({ index: 3, text: '' + unread })
      else wx.removeTabBarBadge({ index: 3 })
    })
  },

  switchTab: function (e) {
    this.setData({ activeTab: Number(e.currentTarget.dataset.key) })
    this.load(1, true)
  },

  tapMessage: function (e) {
    var id = e.currentTarget.dataset.id
    var msg = this.data.messages.filter(function (m) { return m.id === id })[0]
    api.readMessage(id).then(function () {
      // 跳转关联页
      if (msg.type === 2 && msg.relatedId) {
        wx.navigateTo({ url: '/pages/order/detail?id=' + msg.relatedId })
      } else if (msg.type === 3) {
        wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
      } else {
        toast.toast(msg.content)
      }
    })
    this.load(this.data.page, true)
  },

  readAll: function () {
    var that = this
    api.readAllMessages().then(function () {
      toast.success('已全部已读')
      that.load(1, true)
    })
  },

  onReachBottom: function () {
    if (this.data.hasMore && !this.data.loading) {
      this.load(this.data.page + 1, false)
    }
  },

  onPullDownRefresh: function () {
    this.load(1, true)
    wx.stopPullDownRefresh()
  },

  onImgError: function (e) { img.make(this)(e) }
})
