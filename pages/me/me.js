// pages/me/me.js 个人中心
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    userInfo: null,
    member: null,
    points: 0,
    couponCount: 0,
    orderCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    // 订单快捷入口
    orderEntries: [
      { status: 1, name: '待付款', icon: '/https/images/icons/money_bag.png' },
      { status: 2, name: '待发货', icon: '/https/images/icons/card_bag.png' },
      { status: 3, name: '配送中', icon: '/https/images/icons/shopping.png' },
      { status: 4, name: '待收货', icon: '/https/images/icons/see.png' },
      { status: 5, name: '待评价', icon: '/https/images/icons/smile.png' }
    ],
    menuGroups: [
      {
        title: '会员权益',
        items: [
          { name: '会员中心', icon: '/https/images/icons/card_bag.png', link: 'tab:vip' },
          { name: '每日签到', icon: '/https/images/icons/tag.png', link: '/pages/member/checkin', redDot: true, redDotKey: 'checkin' },
          { name: '我的积分', icon: '/https/images/icons/money_bag.png', link: '/pages/member/points' },
          { name: '领券中心', icon: '/https/images/icons/tag.png', link: '/pages/promotion/index?tab=coupon' },
          { name: '促销活动', icon: '/https/images/icons/group.png', link: '/pages/promotion/index?tab=seckill' }
        ]
      },
      {
        title: '我的服务',
        items: [
          { name: '收货地址', icon: '/https/images/icons/person_active.png', link: '/pages/address/list' },
          { name: '购物车', icon: '/https/images/icons/shopping.png', link: 'tab:shop' },
          { name: '收藏记录', icon: '/https/images/icons/like.png', link: '/pages/my/collect' },
          { name: '浏览足迹', icon: '/https/images/icons/see.png', link: '/pages/my/footprint' },
          { name: '我的拼团', icon: '/https/images/icons/group.png', link: '/pages/coupon/index?tab=group' },
          { name: '消息中心', icon: '/https/images/icons/message_active.png', link: '/pages/message/index', redDot: true, redDotKey: 'message' }
        ]
      },
      {
        title: '店铺与配送',
        items: [
          { name: '店铺主页', icon: '/https/images/icons/community.png', link: '/pages/company/company' },
          { name: '店铺评价', icon: '/https/images/icons/smile.png', link: '/pages/company/company?section=review' },
          { name: '配送说明', icon: '/https/images/icons/see.png', link: '/pages/company/company?section=delivery' }
        ]
      },
      {
        title: '其他',
        items: [
          { name: '联系客服', icon: '/https/images/icons/person_active.png', action: 'service' },
          { name: '关于我们', icon: '/https/images/icons/mini_program.png', link: '/pages/company/company' },
          { name: '设置', icon: '/https/images/icons/menu_settings.png', action: 'settings' }
        ]
      }
    ],
    redDots: { checkin: true, message: true },
    unreadCount: 0,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.loadUser()
    this.loadMember()
    this.loadOrderCounts()
    this.loadCouponCount()
    this.loadRedDots()
  },

  loadRedDots: function () {
    var that = this
    // 签到红点：今日未签显示
    api.getCheckin().then(function (c) {
      that.setData({ 'redDots.checkin': !c.todaySigned })
    })
    // 消息红点 + TabBar 角标：未读数
    api.getMessages().then(function (list) {
      var unread = (list || []).filter(function (m) { return !m.isRead }).length
      that.setData({ 'redDots.message': unread > 0, unreadCount: unread })
      if (unread > 0) wx.setTabBarBadge({ index: 3, text: '' + unread })
      else wx.removeTabBarBadge({ index: 3 })
    })
  },

  loadUser: function () {
    var app = getApp()
    var userInfo = (app.globalData && app.globalData.userInfo) || {
      nickName: '鲜果达人',
      avatarUrl: '/https/images/me-icon/01.png'
    }
    this.setData({ userInfo: userInfo })
  },

  loadMember: function () {
    var that = this
    api.getMember().then(function (m) {
      if (m) that.setData({ member: m, points: m.points })
    })
  },

  loadOrderCounts: function () {
    var that = this
    api.getOrders({ page: 1, pageSize: 100 }).then(function (res) {
      var list = (res && res.list) || []
      var counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      list.forEach(function (o) {
        if (counts[o.status] !== undefined) counts[o.status]++
      })
      // 待评价 = 已完成但未评价
      var reviewed = list.filter(function (o) { return o.status === 5 && o.isReviewed }).length
      counts[5] = list.filter(function (o) { return o.status === 5 }).length - reviewed
      that.setData({ orderCounts: counts })
    })
  },

  loadCouponCount: function () {
    var that = this
    api.userCoupons(1).then(function (list) {
      that.setData({ couponCount: (list || []).length })
    })
  },

  // 订单快捷入口 → 对应状态列表
  goOrderList: function (e) {
    var status = e.currentTarget.dataset.status
    wx.navigateTo({ url: '/pages/order/list?status=' + status })
  },

  goAllOrders: function () {
    wx.navigateTo({ url: '/pages/order/list?status=all' })
  },

  onMenuTap: function (e) {
    var item = e.currentTarget.dataset.item
    if (!item) return
    if (item.action === 'checkin') { this.doCheckin(); return }
    if (item.action === 'service') { this.contactService(); return }
    if (item.action === 'settings') { this.openSettings(); return }
    if (item.link) {
      if (item.link.indexOf('tab:') === 0) {
        var tab = item.link.replace('tab:', '')
        wx.switchTab({ url: '/pages/' + tab + '/' + tab })
      } else {
        wx.navigateTo({ url: item.link })
      }
    }
  },

  doCheckin: function () {
    var that = this
    api.checkin().then(function (res) {
      if (res.ok) {
        toast.success('签到成功，+10积分')
        that.loadMember()
      } else {
        toast.toast(res.msg || '今日已签到')
      }
    })
  },

  contactService: function () {
    wx.showModal({
      title: '联系客服',
      content: '客服热线：400-888-8888（9:00-21:00）\n在线客服：演示环境，欢迎咨询',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  openSettings: function () {
    var that = this
    wx.showActionSheet({
      itemList: ['清除缓存', '退出登录'],
      success: function (res) {
        if (res.tapIndex === 0) {
          try {
            wx.clearStorageSync()
          } catch (e) {}
          toast.success('缓存已清除')
          that.loadUser()
          that.loadMember()
        } else if (res.tapIndex === 1) {
          getApp().globalData.userInfo = { nickName: '鲜果达人', avatarUrl: '/https/images/me-icon/01.png' }
          that.loadUser()
          toast.success('已退出登录（演示）')
        }
      }
    })
  },

  goVip: function () {
    wx.switchTab({ url: '/pages/vip/vip' })
  },

  goPoints: function () { wx.navigateTo({ url: '/pages/member/points' }) },
  goCoupon: function () { wx.navigateTo({ url: '/pages/coupon/index' }) },
  goAddress: function () { wx.navigateTo({ url: '/pages/address/list' }) },

  onImgError: function (e) { img.make(this)(e) }
})
