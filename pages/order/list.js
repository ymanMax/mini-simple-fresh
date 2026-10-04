// pages/order/list.js —— 订单列表：状态Tab、订单卡、下拉刷新、上拉分页
var mixin = require('../../utils/mixin.js')
var api = mixin.api
var fmt = require('../../utils/format.js')

Page({
  data: {
    loading: true,
    tabs: [
      { key: 0, name: '全部' },
      { key: 1, name: '待付款' },
      { key: 2, name: '待发货' },
      { key: 3, name: '配送中' },
      { key: 4, name: '待收货' },
      { key: 5, name: '已完成' }
    ],
    activeTab: 0,
    orders: [],
    page: 1,
    total: 0,
    pageSize: 10,
    noMore: false
  },

  onLoad: function (options) {
    if (options.status) this.setData({ activeTab: Number(options.status) })
    this.loadOrders(true)
  },
  onShow: function () {
    // 返回时刷新（支付/取消后状态更新）
    if (!this.data.loading) this.loadOrders(true)
  },

  switchTab: function (e) {
    this.setData({ activeTab: Number(e.currentTarget.dataset.key), orders: [], page: 1 })
    this.loadOrders(true)
  },

  loadOrders: function (reset) {
    var that = this
    this.setData({ loading: true })
    var page = reset ? 1 : this.data.page + 1
    var query = { page: page, pageSize: this.data.pageSize }
    if (this.data.activeTab > 0) query.status = this.data.activeTab
    api.getOrders(query).then(function (res) {
      var list = (reset ? res.list : that.data.orders.concat(res.list)).map(function (o) {
        return Object.assign({}, o, { statusName: fmt.statusName(o.status) })
      })
      that.setData({
        orders: list, page: res.page, total: res.total,
        noMore: list.length >= res.total, loading: false
      })
    })
  },

  onReachBottom: function () {
    if (!this.data.noMore && !this.data.loading) this.loadOrders(false)
  },
  onPullDownRefresh: function () {
    var that = this
    this.loadOrders(true)
    setTimeout(function () { wx.stopPullDownRefresh() }, 600)
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/order/detail?id=' + e.currentTarget.dataset.id })
  },

  goShopping: function () {
    wx.switchTab({ url: '/pages/index/index' })
  },

  onImgError: mixin.onImgError
})
