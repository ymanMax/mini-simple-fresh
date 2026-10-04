const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const badge = require('../../utils/badge.js')

Page({
  data: {
    userInfo: null, guest: true,
    member: null, points: 0, couponCount: 0,
    orderCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    menus: [], loading: true, messageUnread: 0
  },

  onLoad() { this.loadAll() },
  onShow() { this.loadAll() },

  loadAll() {
    Promise.all([api.me(), api.member(), api.myCoupons(1), api.orders({ page: 1, size: 100 }), api.messages(), api.checkinMonth()])
      .then(([me, member, coupons, orders, messages, ck]) => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
        orders.list.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++ })
        const today = new Date()
        const pad = n => n < 10 ? '0' + n : '' + n
        const todayStr = today.getFullYear() + '-' + pad(today.getMonth()+1) + '-' + pad(today.getDate())
        const checkinDone = ck.checkin.lastDate === todayStr
        // 菜单红点标注：签到未签、消息未读
        const menus = me.list.map(m => Object.assign({}, m, {
          dot: (m.title === '每日签到' && !checkinDone) || (m.title === '消息中心' && messages.filter(x => !x.isRead).length > 0)
        }))
        // 成长值进度
        const growthPercent = Math.min(100, Math.round(member.growthValue / member.nextLevelGrowth * 100))
        this.setData({
          member: member, points: member.points, couponCount: coupons.length,
          orderCounts: counts, menus: menus, messageUnread: messages.filter(m => !m.isRead).length,
          checkinDone: checkinDone, growthPercent: growthPercent, loading: false,
          userInfo: (getApp().globalData.userInfo) || { nickName: '鲜生活用户', avatarUrl: '/images/avatar.png' }
        })
        // 未读消息 → TabBar"我的"角标
        badge.setMessageBadge(messages.filter(m => !m.isRead).length)
      })
      .catch(() => this.setData({ loading: false }))
    api.cart().then(c => badge.setCartBadge(c.reduce((s, x) => s + x.count, 0))).catch(() => {})
  },

  getUserProfile() {
    if (wx.getUserProfile) {
      wx.getUserProfile({
        desc: '用于展示个人中心头像昵称',
        success: res => {
          getApp().globalData.userInfo = res.userInfo
          this.setData({ userInfo: res.userInfo, guest: false })
          toast.success('授权成功')
        },
        fail: () => {}
      })
    }
  },

  goMenu(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    if (url === 'modal:service') {
      wx.showModal({ title: '联系客服', content: '客服热线：400-888-9999（9:00-22:00）\n演示环境，不产生真实通话。', showCancel: false })
      return
    }
    if (url === 'modal:settings') { this.settings(); return }
    const TABS = ['/pages/index/index', '/pages/vip/vip', '/pages/shop/shop', '/pages/me/me']
    if (TABS.indexOf(url) >= 0) wx.switchTab({ url: url })
    else wx.navigateTo({ url: url })
  },

  settings() {
    wx.showModal({
      title: '设置',
      content: '清除缓存或退出登录',
      confirmText: '清除缓存', cancelText: '退出登录',
      success: res => {
        if (res.confirm) {
          wx.clearStorageSync()
          toast.success('缓存已清除')
          setTimeout(() => wx.reLaunch({ url: '/pages/index/index' }), 800)
        } else if (res.cancel) {
          getApp().globalData.userInfo = null
          this.setData({ userInfo: { nickName: '鲜生活用户', avatarUrl: '/images/avatar.png' }, guest: true })
          toast.success('已退出登录')
        }
      }
    })
  },

  goOrderTab(e) {
    const status = e.currentTarget.dataset.status
    wx.navigateTo({ url: '/pages/order/list?status=' + status })
  },
  goAllOrders() { wx.navigateTo({ url: '/pages/order/list' }) },

  onPullDownRefresh() {
    this.loadAll()
    setTimeout(() => wx.stopPullDownRefresh(), 600)
  }
})
