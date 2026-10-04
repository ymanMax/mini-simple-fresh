// pages/my/my.js —— 个人信息/设置页（备用入口）：展示用户信息与快捷功能
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    userInfo: null,
    member: null,
    menu: [
      { name: '我的订单', url: '/pages/order/list?status=0', icon: '/images/icons/card_bag.png' },
      { name: '收货地址', url: '/pages/address/list', icon: '/images/icons/community.png' },
      { name: '我的优惠券', url: '/pages/coupon/index', icon: '/images/icons/tag.png' },
      { name: '我的积分', url: '/pages/member/points', icon: '/images/icons/money_bag.png' },
      { name: '每日签到', url: '/pages/member/checkin', icon: '/images/icons/scan_code.png' },
      { name: '消息中心', url: '/pages/messages/index', icon: '/images/icons/message_active.png' },
      { name: '收藏记录', url: '/pages/my/collect', icon: '/images/icons/like.png' },
      { name: '浏览足迹', url: '/pages/my/footprint', icon: '/images/icons/see.png' },
      { name: '促销活动', url: '/pages/promotion/index', icon: '/images/icons/game.png' },
      { name: '关于我们', url: '/pages/company/company', icon: '/images/icons/mp.png' }
    ]
  },

  onShow: function () {
    var that = this
    var app = getApp()
    api.getMember().then(function (m) {
      that.setData({ loading: false, member: m, userInfo: app.globalData.userInfo || { nickName: m.nickName, avatarUrl: m.avatar } })
    })
  },

  tapMenu: function (e) {
    wx.navigateTo({ url: e.currentTarget.dataset.url })
  },

  goVip: function () { wx.switchTab({ url: '/pages/vip/vip' }) },
  goHome: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: mixin.onImgError
})
