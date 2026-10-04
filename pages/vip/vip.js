// pages/vip/vip.js —— 会员中心：用户卡、权益、红包（可领取）、会员商品（加购/跳详情）、开通会员
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    benefits: [],
    redbags: [],
    products: [],
    member: null
  },

  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getVipData(), api.getMember()]).then(function (res) {
      var vip = res[0]
      var m = res[1]
      // 需求8.1：成长值进度条（当前/下一级，纯CSS）+ 五级成长体系表
      var levels = [
        { level: 1, name: '普通会员', growth: 0, discount: '无折扣', freeShip: '满59免配送费' },
        { level: 2, name: '银卡会员', growth: 1000, discount: '98折', freeShip: '满39免配送费' },
        { level: 3, name: '金卡会员', growth: 3000, discount: '96折', freeShip: '满39免配送费' },
        { level: 4, name: '铂金会员', growth: 8000, discount: '94折', freeShip: '满29免配送费' },
        { level: 5, name: '钻石会员', growth: 15000, discount: '92折', freeShip: '全场免配送费' }
      ]
      var cur = levels[m.level - 1] || levels[0]
      var next = levels[m.level] || null
      var progress = next ? Math.min(100, Math.round((m.growthValue - cur.growth) / (next.growth - cur.growth) * 100)) : 100
      var remain = next ? (next.growth - m.growthValue) : 0
      that.setData({
        loading: false,
        benefits: vip.data[0].data,
        redbags: vip.data[1].data,
        products: vip.data[2].data,
        member: m, levels: levels, progress: progress, remain: remain,
        birthdayBanner: true // 生日月礼包横幅
      })
    })
  },

  // 生日礼包跳转我的优惠券
  goCoupons: function () { wx.navigateTo({ url: '/pages/coupon/index' }) },

  // 领取红包
  claimRedbag: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.claimRedPacket(id).then(function (res) {
      wx.showToast({ title: res.msg, icon: res.success ? 'success' : 'none' })
      if (res.success) that.loadData()
    })
  },

  // 会员商品加购
  addCart: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    api.addToCart(id, '标准装 · 常规包装', 1).then(function (res) {
      if (res.success) { wx.showToast({ title: '加入购物车成功', icon: 'none' }); mixin.updateTabBadge.call(that) }
    })
  },

  goDetail: function (e) { mixin.goDetail.call(this, e.currentTarget.dataset.id) },

  // 开通会员（mock）
  openVip: function () {
    wx.showModal({
      title: '开通会员', content: '开通优享会员，全年预计节省1121元，享专属折扣、免配送费等权益（演示，不产生真实交易）',
      confirmText: '立即开通（¥15/月）',
      success: function (res) {
        if (res.confirm) wx.showToast({ title: '开通成功（演示）', icon: 'success' })
      }
    })
  },

  showword: function () {
    wx.showModal({ title: '订阅成功', content: '该商品到货之后，会通过微信消息第一时间告诉您', showCancel: false })
  },

  onImgError: mixin.onImgError
})
