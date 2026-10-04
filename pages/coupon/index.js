// pages/coupon/index.js 领券中心 + 我的优惠券 + 拼团
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    tabs: ['领券中心', '我的优惠券', '拼团特惠'],
    activeTab: 0,
    mineSubTab: 1, // 1未使用 2已使用 3已过期
    center: [],
    mine: [],
    filteredMine: [],
    groups: [],
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    if (options.tab === 'group') this.setData({ activeTab: 2 })
    this.loadAll()
  },

  onShow: function () {
    this.loadAll()
  },

  loadAll: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([
      api.couponCenter(),
      api.userCoupons(),
      api.getGoods({ page: 1, pageSize: 12 })
    ]).then(function (results) {
      var formatCoupon = function (c) {
        var amountText = c.type === 2 ? (c.discount / 10) + '折' : '¥' + c.discount
        var condText = c.threshold > 0 ? ('满' + c.threshold + '元可用') : '无门槛'
        return Object.assign({}, c, { amountText: amountText, condText: condText, groupPriceYuan: F.fen2yuan(c.groupPrice || c.originalPrice), originalPriceYuan: F.fen2yuan(c.originalPrice) })
      }
      var center = (results[0] || []).map(formatCoupon)
      var mine = (results[1] || []).map(formatCoupon)
      var goodsRes = results[2] || {}
      var goods = goodsRes.list || []
      // 拼团：从商品构造拼团活动
      var groups = goods.slice(0, 4).map(function (g, i) {
        return {
          id: i + 1,
          goodsId: g.id,
          name: g.name,
          pic: g.pic,
          originalPrice: g.minPrice,
          groupPrice: Math.round(g.minPrice * 0.8),
          originalPriceYuan: F.fen2yuan(g.minPrice),
          groupPriceYuan: F.fen2yuan(Math.round(g.minPrice * 0.8)),
          requiredCount: i % 2 === 0 ? 2 : 3,
          joinedCount: 1,
          endHours: 24 + i * 5,
          members: [
            { name: '我', isLeader: true, avatar: '/https/images/me-icon/01.png' },
            { name: '鲜果达人', isLeader: false, avatar: '/https/images/me-icon/02.png' }
          ]
        }
      })
      that.setData({
        center: center,
        mine: mine,
        groups: groups,
        loading: false
      })
      that.filterMine()
    })
  },

  filterMine: function () {
    var sub = this.data.mineSubTab
    var filtered = (this.data.mine || []).filter(function (c) { return c.status === sub })
    this.setData({ filteredMine: filtered })
  },

  switchTab: function (e) {
    this.setData({ activeTab: Number(e.currentTarget.dataset.index) })
  },

  switchMineSub: function (e) {
    this.setData({ mineSubTab: Number(e.currentTarget.dataset.index) })
    this.filterMine()
  },

  claim: function (e) {
    var id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(function (res) {
      if (res.ok) toast.success('领取成功')
      else toast.toast(res.msg || '领取失败')
    })
    this.loadAll()
  },

  joinGroup: function (e) {
    var id = e.currentTarget.dataset.id
    toast.success('已参与拼团，等待成团（演示）')
  },

  goUse: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onImgError: function (e) { img.make(this)(e) }
})
