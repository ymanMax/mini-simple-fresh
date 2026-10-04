// pages/vip/vip.js —— 会员中心（Tab）：会员等级成长 / 权益 / 红包 / 生日福利 / 专享商品（需求8）
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')
var badge = require('../../utils/badge.js')

Page({
  data: {
    member: null,
    privileges: [],
    redPackets: [],
    products: [],
    yearlySaving: 0,
    levels: [],
    currentLevel: null,
    nextLevel: null,
    growthProgress: 0,
    toNext: 0,
    birthdayGift: true,
    loading: true
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    api.get('/api/vip/home').then(function (data) {
      that.setData({
        member: data.member,
        privileges: data.privileges,
        redPackets: data.redPackets,
        products: data.products,
        yearlySaving: data.yearlySaving,
        levels: data.levels,
        currentLevel: data.currentLevel,
        nextLevel: data.nextLevel,
        growthProgress: data.growthProgress,
        toNext: data.toNext,
        birthdayGift: data.birthdayGift,
        loading: false
      })
    }).catch(function () { that.setData({ loading: false }) })
  },

  // 开通会员（mock）
  openVip: function () {
    wx.showModal({
      title: '开通会员',
      content: '开通金卡会员仅需 8 元/月，享专属折扣、每月赠券、优先配送等权益（演示环境）',
      confirmText: '立即开通',
      confirmColor: '#e93b3d',
      success: function (res) {
        if (res.confirm) toast.success('已开通会员（演示）')
      }
    })
  },

  // 领取红包 → 领券中心
  goCoupon: function () {
    wx.navigateTo({ url: '/pages/coupon/index?tab=center' })
  },

  goMyCoupons: function () {
    wx.navigateTo({ url: '/pages/coupon/index?tab=1' })
  },

  goCheckin: function () {
    wx.navigateTo({ url: '/pages/member/checkin' })
  },

  // 会员商品
  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.id })
  },

  addCart: function (e) {
    var id = e.currentTarget.dataset.id
    api.post('/api/cart/add', { goodsId: id, specLabel: '标准装', count: 1 }).then(function () {
      toast.success('加入购物车成功')
      badge.refreshCartBadge()
    })
  },

  // 到货提醒
  arrivalReminder: function () {
    wx.showModal({
      title: '订阅成功',
      content: '该商品到货之后，会通过微信消息第一时间通知您',
      showCancel: false,
      confirmColor: '#e93b3d'
    })
  }
})
