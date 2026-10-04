const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')

const TYPE_ICON = { 1: '📢', 2: '📦', 3: '🎉', 4: '💬' }
const TYPE_NAME = { 1: '系统', 2: '订单', 3: '促销', 4: '互动' }

Page({
  data: {
    tabs: [{ key: 0, name: '全部' }, { key: 2, name: '订单' }, { key: 3, name: '促销' }, { key: 1, name: '系统' }],
    filter: 0, messages: [], page: 1, hasMore: true, loading: true,
    unreadCount: 0, pushTimer: null
  },

  onLoad() { this.load(1) },
  onShow() { this.load(this.data.page) },

  onUnload() { if (this.data.pushTimer) clearTimeout(this.data.pushTimer) },

  relativeTime(iso) {
    const t = new Date(iso.replace(/-/g, '/')).getTime()
    const diff = Date.now() - t
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
    if (diff < 2 * 86400000) return '昨天'
    return iso.slice(0, 10)
  },

  decorate(list) {
    return list.map(m => Object.assign({}, m, {
      icon: TYPE_ICON[m.type] || '📢', typeName: TYPE_NAME[m.type] || '', relTime: this.relativeTime(m.createTime)
    }))
  },

  load(page) {
    this.setData({ loading: page === 1 })
    api.messages().then(all => {
      let list = all
      if (this.data.filter) list = list.filter(m => m.type === this.data.filter)
      // 分页：每页10条
      const start = (page - 1) * 10
      const pageList = list.slice(start, start + 10)
      const merged = page === 1 ? pageList : this.data.messages.concat(pageList)
      this.setData({
        messages: this.decorate(merged), page: page, hasMore: start + 10 < list.length,
        loading: false, unreadCount: all.filter(m => !m.isRead).length
      })
      // mock 延迟推送：进入3秒后 push 一条促销提醒
      if (!this._pushSet && page === 1) {
        this._pushSet = true
        const timer = setTimeout(() => {
          api.pushDemoMessage().then(() => { this.load(1) }).catch(() => {})
        }, 3000)
        this.setData({ pushTimer: timer })
      }
    }).catch(() => this.setData({ loading: false }))
  },

  switchFilter(e) {
    this.setData({ filter: Number(e.currentTarget.dataset.filter), page: 1 })
    this.load(1)
  },

  openMsg(e) {
    const id = e.currentTarget.dataset.id
    const msg = this.data.messages.find(m => m.id === id)
    api.readMessage(id).then(() => {
      const messages = this.data.messages.map(m => m.id === id ? Object.assign({}, m, { isRead: true }) : m)
      this.setData({ messages: messages, unreadCount: this.data.unreadCount - 1 })
      badge.setTabBarBadgeMsg(this.data.unreadCount)
      // 关联跳转
      if (msg.relatedId && msg.type === 2) wx.navigateTo({ url: '/pages/order/detail?id=' + msg.relatedId })
      else if (msg.type === 3) wx.navigateTo({ url: '/pages/promotion/index?tab=seckill' })
      else if (msg.type === 1) wx.showModal({ title: msg.title, content: msg.content, showCancel: false })
    }).catch(() => {})
  },

  readAll() {
    api.readAllMessages().then(() => {
      toast.success('已全部标记已读')
      this.setData({ messages: this.data.messages.map(m => Object.assign({}, m, { isRead: true })), unreadCount: 0 })
      badge.removeMessageBadge()
    }).catch(() => {})
  },

  onReachBottom() { if (this.data.hasMore && !this.data.loading) this.load(this.data.page + 1) },
  onPullDownRefresh() { this.load(1); setTimeout(() => wx.stopPullDownRefresh(), 500) }
})
