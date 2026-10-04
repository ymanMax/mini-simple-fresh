// pages/me/me.js —— 个人中心（需求5/10）：用户卡/成长进度/订单角标/菜单分组/消息未读
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')
var app = getApp()

Page({
  data: {
    user: null,
    isGuest: true,
    member: { points: 0, levelName: '游客', validDate: '', growthValue: 0 },
    growthProgress: 0,
    nextLevelName: '',
    toNext: 0,
    orderCounts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, all: 0, review: 0 },
    couponCount: 0,
    messageCount: 0,
    checkinDot: false,
    menuGroups: [
      {
        title: '会员权益',
        items: [
          { icon: '👑', name: '会员中心', action: 'tabVip' },
          { icon: '⚡', name: '限时抢购', url: '/pages/promotion/index?tab=seckill' },
          { icon: '📅', name: '每日签到', url: '/pages/member/checkin', redDot: true },
          { icon: '⭐', name: '我的积分', url: '/pages/member/points' },
          { icon: '🎫', name: '领券中心', url: '/pages/coupon/index?tab=center' },
          { icon: '🧧', name: '我的优惠券', url: '/pages/coupon/index?tab=1' }
        ]
      },
      {
        title: '我的服务',
        items: [
          { icon: '📦', name: '收货地址', url: '/pages/address/list' },
          { icon: '🛒', name: '购物车', action: 'tabShop' },
          { icon: '❤️', name: '收藏记录', url: '/pages/my/collect' },
          { icon: '👣', name: '浏览足迹', url: '/pages/my/footprint' },
          { icon: '👥', name: '我的拼团', url: '/pages/group/index' }
        ]
      },
      {
        title: '店铺与配送',
        items: [
          { icon: '🏪', name: '店铺主页', url: '/pages/company/company' },
          { icon: '💬', name: '店铺评价', url: '/pages/company/company' },
          { icon: '🚚', name: '配送说明', action: 'delivery' }
        ]
      },
      {
        title: '其他',
        items: [
          { icon: '📨', name: '消息中心', url: '/pages/message/index', msgDot: true },
          { icon: '🎧', name: '联系客服', action: 'service' },
          { icon: 'ℹ️', name: '关于我们', url: '/pages/company/company' },
          { icon: '⚙️', name: '设置', action: 'settings' }
        ]
      }
    ]
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    var that = this
    this.setData({ user: app.getUser(), isGuest: !app.globalData.userInfo })
    Promise.all([
      api.get('/api/member/info'),
      api.get('/api/orders/list', { status: 'all', page: 1, pageSize: 100 }),
      api.get('/api/coupons/mine', { status: 1 }),
      api.get('/api/messages/list', { page: 1, pageSize: 100 }),
      api.get('/api/checkin/status'),
      api.get('/api/vip/home')
    ]).then(function (res) {
      var counts = { all: res[1].total, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, review: 0 }
      res[1].list.forEach(function (o) { counts[String(o.status)] = (counts[String(o.status)] || 0) + 1 })
      counts.review = res[1].list.filter(function (o) { return o.status === 5 && !o.isReviewed }).length
      that.setData({
        member: res[0].member,
        orderCounts: counts,
        couponCount: res[2].list.length,
        messageCount: res[3].list.filter(function (m) { return !m.isRead }).length,
        checkinDot: !res[4].checkedToday,
        growthProgress: res[5].growthProgress,
        nextLevelName: res[5].nextLevel ? res[5].nextLevel.name : '',
        toNext: res[5].toNext
      })
      badge.refreshAllBadges()
    })
  },

  onLogin: function (e) {
    if (e.detail && e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo
      this.setData({ user: app.getUser(), isGuest: false })
      toast.success('登录成功')
    }
  },

  onMenu: function (e) {
    var that = this
    var item = e.currentTarget.dataset.item
    if (item.action === 'service') {
      wx.showModal({
        title: '联系客服',
        content: '客服热线：400-888-0000（9:00-21:00）\n演示环境：在线客服暂未接入，可拨打热线咨询。',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#e93b3d'
      })
      return
    }
    if (item.action === 'delivery') {
      wx.showModal({
        title: '配送说明',
        content: '· 满 59 元免基础配送费，未满收 6 元\n· 预计 45 分钟送达，支持预约时段\n· 坏果包赔，7天无忧退换\n· 演示环境，不产生真实交易',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#e93b3d'
      })
      return
    }
    if (item.action === 'settings') {
      wx.showActionSheet({
        itemList: ['清除缓存', '退出登录'],
        success: function (res) {
          if (res.tapIndex === 0) {
            try {
              wx.removeStorageSync('search_history')
              wx.removeStorageSync('logs')
            } catch (e) {}
            toast.success('缓存已清除')
          } else {
            app.globalData.userInfo = null
            that.setData({ user: app.getUser(), isGuest: true })
            toast.success('已退出登录')
          }
        }
      })
      return
    }
    if (item.action === 'tabVip') { wx.switchTab({ url: '/pages/vip/vip' }); return }
    if (item.action === 'tabShop') { wx.switchTab({ url: '/pages/shop/shop' }); return }
    wx.navigateTo({ url: item.url })
  },

  orderEntry: function (e) {
    var status = e.currentTarget.dataset.status
    wx.navigateTo({ url: '/pages/order/list?status=' + status })
  },

  goAllOrders: function () {
    wx.navigateTo({ url: '/pages/order/list?status=all' })
  },

  goCoupon: function () {
    wx.navigateTo({ url: '/pages/coupon/index?tab=1' })
  },

  goMessages: function () {
    wx.navigateTo({ url: '/pages/message/index' })
  }
})
