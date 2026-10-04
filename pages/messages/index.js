// pages/messages/index.js —— 消息中心：类型Tab、相对时间、未读红点、全部已读、分页、3秒延迟推送、关联跳转
var mixin = require('../../utils/mixin.js')
var api = mixin.api

// 相对时间：刚刚/x分钟前/x小时前/昨天/日期
function thatRelative(t) {
  var now = new Date()
  var d = new Date(t.replace(/-/g, '/'))
  var diff = now - d
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 172800000) return '昨天'
  return t.slice(5, 16)
}

Page({
  data: {
    loading: true,
    messages: [],
    allMessages: [],
    tabs: [{ key: 0, name: '全部' }, { key: 2, name: '订单' }, { key: 3, name: '促销' }, { key: 1, name: '系统' }],
    activeTab: 0,
    page: 1,
    pageSize: 10,
    total: 0,
    noMore: false,
    unread: 0,
    pushed: false,
    list: []
  },

  onShow: function () { this.loadData(true) },

  loadData: function (reset) {
    var that = this
    this.setData({ loading: true })
    api.getMessages().then(function (list) {
      that.setData({ allMessages: list, messages: list, loading: false, total: list.length })
      that.filterList(reset !== false)
      // 3秒延迟推送演示（需求10.3）：进入消息中心3秒后push一条促销消息，不报错
      if (!that.data.pushed) {
        that.setData({ pushed: true })
        setTimeout(function () {
          api.pushDelayedSeckillMessage().then(function () {
            api.getMessages().then(function (m2) {
              that.setData({ allMessages: m2 })
              that.filterList(true)
              wx.showToast({ title: '收到新消息', icon: 'none' })
            })
          })
        }, 3000)
      }
    })
  },

  filterList: function (reset) {
    var list = this.data.activeTab === 0 ? this.data.allMessages : this.data.allMessages.filter(function (m) { return m.type === this.data.activeTab }, this)
    var page = reset ? 1 : this.data.page
    var pageSize = this.data.pageSize
    var paged = list.slice(0, page * pageSize).map(function (m) {
      // 预计算图标与类型文案（WXML不使用嵌套三元）
      var icon = m.type === 2 ? '/images/icons/card_bag.png' : m.type === 3 ? '/images/icons/tag.png' : '/images/icons/mini_program.png'
      var typeText = m.type === 1 ? '系统' : m.type === 2 ? '订单' : m.type === 3 ? '促销' : '互动'
      return Object.assign({}, m, { relativeText: thatRelative(m.createTime), msgIcon: icon, typeText: typeText })
    })
    this.setData({ list: paged, page: page, total: list.length, noMore: paged.length >= list.length, unread: this.data.allMessages.filter(function (m) { return !m.isRead }).length })
  },

  switchTab: function (e) {
    this.setData({ activeTab: Number(e.currentTarget.dataset.key), page: 1 })
    this.filterList(true)
  },

  // 点击消息：标记已读并跳转关联页
  tapMessage: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.markRead(id).then(function () {
      var messages = that.data.allMessages.map(function (m) { if (m.id === id) m.isRead = true; return m })
      that.setData({ allMessages: messages })
      that.filterList(true)
      var msg = messages.filter(function (m) { return m.id === id })[0]
      if (!msg) return
      // 订单消息 → 订单详情；促销消息 → 促销活动页；系统 → 无跳转
      if (msg.relatedId && msg.relatedId.indexOf('o') === 0 && msg.relatedId.length > 1) {
        wx.navigateTo({ url: '/pages/order/detail?id=' + msg.relatedId })
      } else if (msg.relatedId && msg.relatedId.indexOf('promotion') >= 0) {
        wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
      }
    })
  },

  // 全部已读：清除未读，移除TabBar角标
  markAllRead: function () {
    var that = this
    api.markAllRead().then(function () {
      wx.showToast({ title: '已全部已读', icon: 'success' })
      that.loadData(true)
      mixin.updateTabBadge.call(that)
    })
  },

  onReachBottom: function () {
    if (!this.data.noMore) {
      this.setData({ page: this.data.page + 1 })
      this.filterList(false)
    }
  },
  onPullDownRefresh: function () {
    var that = this
    this.loadData(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  onImgError: mixin.onImgError
})
