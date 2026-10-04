// pages/coupon/index.js —— 领券中心 + 我的优惠券（未使用/已使用/已过期）
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    tab: 0, // 0领券中心 1我的优惠券
    myTab: 1, // 1未使用 2已使用 3已过期
    center: [],
    myCoupons: [],
    list: []
  },

  onShow: function () {
    this.loadData()
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getCouponCenter(), api.getMyCoupons()]).then(function (res) {
      // 预计算面额文案（WXML 不支持方法调用）
      var center = res[0].map(function (c) { return Object.assign({}, c, { amountText: that.amountText(c) }) })
      var myCoupons = res[1].map(function (c) { return Object.assign({}, c, { amountText: that.amountText(c) }) })
      that.setData({ loading: false, center: center, myCoupons: myCoupons })
      that.filterList()
    })
  },

  amountText: function (c) {
    if (c.type === 3) return '¥' + (c.discount / 100).toFixed(0)
    if (c.type === 2) return (c.discount / 10).toFixed(1) + '折'
    return '¥' + (c.discount / 100).toFixed(0)
  },

  filterList: function () {
    var list = this.data.myCoupons.filter(function (c) { return c.status === this.data.myTab }, this)
    this.setData({ list: list })
  },

  switchTab: function (e) { this.setData({ tab: Number(e.currentTarget.dataset.tab) }) },
  switchMyTab: function (e) {
    this.setData({ myTab: Number(e.currentTarget.dataset.tab) })
    this.filterList()
  },

  // 领取
  claim: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(function (res) {
      wx.showToast({ title: res.msg, icon: res.success ? 'success' : 'none' })
      if (res.success) that.loadData()
    })
  },

  // 去使用 → 跳首页/分类
  useCoupon: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onImgError: mixin.onImgError
})
