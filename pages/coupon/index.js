// pages/coupon/index.js —— 领券中心 + 我的优惠券（未使用/已使用/已过期）
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')

var TABS = [
  { key: 'center', name: '领券中心' },
  { key: '1', name: '未使用' },
  { key: '2', name: '已使用' },
  { key: '3', name: '已过期' }
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'center',
    centerList: [],
    myList: [],
    loading: true
  },

  onLoad: function (options) {
    if (options.tab) this.setData({ activeTab: options.tab })
  },

  onShow: function () {
    this.loadData()
  },

  switchTab: function (e) {
    var key = e.currentTarget.dataset.key
    this.setData({ activeTab: key, loading: true })
    this.loadData()
  },

  decorate: function (c, centerMap) {
    var amountLabel, ruleLabel
    if (c.type === 1) {
      amountLabel = '￥' + fmt.yuan(c.discount)
      ruleLabel = '满' + fmt.yuan(c.threshold) + '元可用'
    } else if (c.type === 3) {
      amountLabel = '￥' + fmt.yuan(c.discount)
      ruleLabel = '无门槛通用'
    } else {
      amountLabel = (c.discount / 10) + '折'
      ruleLabel = c.scope
    }
    var center = centerMap && centerMap[c.couponId || c.id]
    return Object.assign({}, c, {
      amountLabel: amountLabel,
      ruleLabel: ruleLabel,
      expireDays: (center && center.expireDays) || c.expireDays || 7
    })
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    if (this.data.activeTab === 'center') {
      api.get('/api/coupons/center').then(function (data) {
        var centerMap = {}
        data.list.forEach(function (c) { centerMap[c.id] = c })
        that.setData({ centerList: data.list.map(function (c) { return that.decorate(c, centerMap) }), loading: false })
      })
    } else {
      Promise.all([
        api.get('/api/coupons/mine', { status: this.data.activeTab }),
        api.get('/api/coupons/center')
      ]).then(function (res) {
        var centerMap = {}
        res[1].list.forEach(function (c) { centerMap[c.id] = c })
        that.setData({ myList: res[0].list.map(function (c) { return that.decorate(c, centerMap) }), loading: false })
      })
    }
  },

  claim: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.post('/api/coupons/claim', { couponId: id }).then(function () {
      toast.success('领取成功')
      that.loadData()
    })
  },

  goUse: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  goCenter: function () {
    this.setData({ activeTab: 'center' })
    this.loadData()
  }
})
