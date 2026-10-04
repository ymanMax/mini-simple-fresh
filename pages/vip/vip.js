// pages/vip/vip.js 会员中心
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    member: null,
    benefits: [],
    couponPackets: [],
    goods: [],
    growthPercent: 0,
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    Promise.all([
      api.getMember(),
      api.userCoupons(1),
      api.getGoods({ page: 1, pageSize: 12 })
    ]).then(function (results) {
      var m = results[0]
      var coupons = results[1] || []
      var goodsRes = results[2] || {}
      var goods = (goodsRes.list || []).map(function (g) {
        return Object.assign({}, g, {
          priceYuan: F.fen2yuan(g.minPrice),
          memberYuan: F.fen2yuan(g.memberPrice),
          originalYuan: F.fen2yuan(g.originalPrice)
        })
      })
      var benefits = [
        { name: '专属折扣', value: '92折' },
        { name: '免配送费门槛', value: '满59元' },
        { name: '优先配送', value: '专属通道' },
        { name: '生日礼包', value: '生日8.8折券' },
        { name: '专属客服', value: '1对1服务' }
      ]
      // 成长体系：普通/银卡/金卡/铂金/钻石
      var growthTiers = [
        { level: '普通', min: 0, discount: '98折', freeFreight: '满99元' },
        { level: '银卡', min: 1000, discount: '96折', freeFreight: '满79元' },
        { level: '金卡', min: 3000, discount: '92折', freeFreight: '满59元' },
        { level: '铂金', min: 8000, discount: '90折', freeFreight: '满39元' },
        { level: '钻石', min: 15000, discount: '88折', freeFreight: '免配送费' }
      ]
      var growthPercent = m ? Math.round(m.growthValue / m.nextLevelGrowth * 100) : 0
      var needGrowth = m ? (m.nextLevelGrowth - m.growthValue) : 0
      // 当前等级高亮
      var curMin = 0, curIdx = 0
      growthTiers.forEach(function (t, i) {
        if (m && m.growthValue >= t.min) { curMin = t.min; curIdx = i }
      })
      growthTiers = growthTiers.map(function (t, i) {
        return Object.assign({}, t, { current: i === curIdx })
      })
      that.setData({
        member: m,
        benefits: benefits,
        couponPackets: coupons,
        goods: goods,
        growthPercent: growthPercent,
        needGrowth: needGrowth,
        growthTiers: growthTiers,
        birthdayGift: true,
        loading: false
      })
    })
  },

  goCoupon: function () { wx.navigateTo({ url: '/pages/coupon/index' }) },
  goPoints: function () { wx.navigateTo({ url: '/pages/member/points' }) },

  goDetail: function (e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id })
  },

  addToCart: function (e) {
    var id = e.currentTarget.dataset.id
    var g = null
    for (var i = 0; i < this.data.goods.length; i++) {
      if (this.data.goods[i].id === id) { g = this.data.goods[i]; break }
    }
    if (!g) return
    api.addToCart({
      goodsId: g.id, name: g.name, pic: g.pic,
      specText: '标准装', price: g.minPrice, count: 1
    }).then(function (res) {
      if (res.ok) toast.success('加入购物车成功')
      else toast.toast(res.msg || '加入购物车失败')
    })
  },

  onImgError: function (e) { img.make(this)(e) }
})
