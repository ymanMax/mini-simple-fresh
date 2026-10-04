// pages/me/me.js —— 个人中心：用户卡、订单快捷入口（带数量角标）、分组菜单、全部入口可用
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    userInfo: null,
    member: null,
    couponCount: 0,
    points: 0,
    cartCount: 0,
    orderCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    // 订单快捷入口
    quickEntries: [
      { key: 1, name: '待付款', icon: '/images/icons/money_bag.png' },
      { key: 2, name: '待发货', icon: '/images/icons/card_bag.png' },
      { key: 3, name: '配送中', icon: '/images/icons/shopping.png' },
      { key: 4, name: '待收货', icon: '/images/icons/community.png' },
      { key: 5, name: '待评价', icon: '/images/icons/smile.png' }
    ],
    // 菜单分组
    groups: [
      {
        title: '会员权益',
        items: [
          { name: '会员中心', icon: '/images/vip.png', url: '/pages/vip/vip', tab: true },
          { name: '每日签到', icon: '/images/icons/scan_code.png', url: '/pages/member/checkin', redDot: true },
          { name: '我的积分', icon: '/images/icons/money_bag.png', url: '/pages/member/points' },
          { name: '领券中心/我的优惠券', icon: '/images/icons/tag.png', url: '/pages/coupon/index' },
          { name: '促销活动', icon: '/images/icons/game.png', url: '/pages/promotion/index' }
        ]
      },
      {
        title: '我的服务',
        items: [
          { name: '收货地址', icon: '/images/icons/community.png', url: '/pages/address/list' },
          { name: '购物车', icon: '/images/icons/cart.png', url: '/pages/shop/shop', tab: true },
          { name: '收藏记录', icon: '/images/icons/like.png', url: '/pages/my/collect' },
          { name: '浏览足迹', icon: '/images/icons/see.png', url: '/pages/my/footprint' },
          { name: '我的拼团', icon: '/images/icons/group.png', url: '/pages/shop-info/index?section=group' }
        ]
      },
      {
        title: '店铺与配送',
        items: [
          { name: '店铺主页', icon: '/images/icons/mini_program.png', url: '/pages/shop-info/index?section=shop' },
          { name: '店铺评价', icon: '/images/icons/new_friends.png', url: '/pages/shop-info/index?section=review' },
          { name: '配送说明', icon: '/images/icons/scan_code.png', url: '/pages/shop-info/index?section=delivery' }
        ]
      },
      {
        title: '其他',
        items: [
          { name: '消息中心', icon: '/images/icons/message_active.png', url: '/pages/messages/index', redDot: true },
          { name: '联系客服', icon: '/images/icons/person_active.png', action: 'service' },
          { name: '关于我们', icon: '/images/icons/mp.png', url: '/pages/company/company' },
          { name: '设置', icon: '/images/icons/menu_settings.png', action: 'settings' }
        ]
      }
    ]
  },

  onShow: function () {
    this.loadData()
    mixin.updateTabBadge.call(this)
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    var app = getApp()
    Promise.all([
      api.getMember(),
      api.getMyCoupons(1),
      api.getOrders({ page: 1, pageSize: 100 }),
      api.getCart(),
      api.getMessages()
    ]).then(function (res) {
      var member = res[0]
      var coupons = res[1]
      var orders = res[2].list
      var cart = res[3]
      var messages = res[4]
      var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      orders.forEach(function (o) { if (counts[o.status] !== undefined) counts[o.status]++ })
      var unread = messages.filter(function (m) { return !m.isRead }).length
      // 今日是否已签到（签到入口红点）
      var today = new Date()
      function p(x) { return x < 10 ? '0' + x : x }
      var todayStr = today.getFullYear() + '-' + p(today.getMonth() + 1) + '-' + p(today.getDate())
      var needCheckin = member.checkIn.lastDate !== todayStr
      // 动态红点：签到（未签）、消息中心（有未读）
      var groups = that.data.groups.map(function (g) {
        g.items = g.items.map(function (it) {
          it.redDot = (it.name === '每日签到' && needCheckin) || (it.name === '消息中心' && unread > 0)
          return it
        })
        return g
      })
      that.setData({
        groups: groups,
        loading: false,
        userInfo: app.globalData.userInfo || { nickName: member.nickName, avatarUrl: member.avatar },
        member: member,
        couponCount: coupons.length,
        points: member.points,
        cartCount: cart.reduce(function (s, c) { return s + c.count }, 0),
        orderCounts: counts,
        unread: unread,
        needCheckin: needCheckin
      })
      // TabBar "我的"角标：未读消息数（需求10.3）
      if (unread > 0) wx.setTabBarBadge({ index: 3, text: String(unread) })
      else wx.removeTabBarBadge({ index: 3 })
    })
  },

  // 订单快捷入口 → 状态列表
  goOrderList: function (e) {
    var status = e.currentTarget.dataset.key
    wx.navigateTo({ url: '/pages/order/list?status=' + status })
  },

  // 全部订单
  goAllOrders: function () {
    wx.navigateTo({ url: '/pages/order/list?status=0' })
  },

  // 菜单入口
  tapMenu: function (e) {
    var item = e.currentTarget.dataset.item
    if (item.action === 'service') {
      wx.showModal({
        title: '联系客服',
        content: '客服热线：400-800-1234（9:00-21:00）\n在线客服将尽快为您服务（演示）',
        confirmText: '拨打', success: function (res) {
          if (res.confirm) wx.makePhoneCall({ phoneNumber: '4008001234', fail: function () {} })
        }
      })
      return
    }
    if (item.action === 'settings') {
      wx.showActionSheet({
        itemList: ['清除缓存', '退出登录'],
        success: function (res) {
          if (res.tapIndex === 0) {
            wx.showModal({
              title: '清除缓存', content: '将清除页面临时缓存，购物车与订单数据保留。',
              success: function (r) {
                if (r.confirm) { wx.showToast({ title: '缓存已清除', icon: 'success' }) }
              }
            })
          } else if (res.tapIndex === 1) {
            wx.showModal({
              title: '退出登录', content: '退出后将使用游客身份浏览（演示）',
              success: function (r) { if (r.confirm) wx.reLaunch({ url: '/pages/index/index' }) }
            })
          }
        }
      })
      return
    }
    if (item.tab) { wx.switchTab({ url: item.url }); return }
    wx.navigateTo({ url: item.url })
  },

  // 进入会员中心
  goVip: function () { wx.switchTab({ url: '/pages/vip/vip' }) },

  onImgError: mixin.onImgError
})
