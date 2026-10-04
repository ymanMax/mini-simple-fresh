// pages/member/points.js —— 积分明细（分页）+ 兑换专区（需求5.2/8.3）
var api = require('../../utils/api.js')
var fmt = require('../../utils/format.js')
var toast = require('../../utils/toast.js')

var TYPE_NAMES = { 1: '购物', 2: '签到', 3: '评价', 4: '兑换消耗', 5: '生日赠送' }

Page({
  data: {
    balance: 0,
    records: [],
    shops: [],
    loading: true,
    tab: 'detail',
    page: 1,
    pageSize: 10,
    hasMore: true,
    checkedToday: false,
    streak: 0
  },

  onShow: function () {
    this.loadAll(true)
    this.loadCheckin()
  },

  loadCheckin: function () {
    var that = this
    api.get('/api/checkin/status').then(function (data) {
      that.setData({ checkedToday: data.checkedToday, streak: data.streak })
    })
  },

  doCheckin: function () {
    var that = this
    api.post('/api/checkin/do', {}).then(function (data) {
      wx.showModal({
        title: '签到成功 🎉',
        content: '本次获得 ' + data.earned + ' 积分，已连续签到 ' + data.streak + ' 天',
        showCancel: false,
        confirmColor: '#e93b3d',
        success: function () { that.loadAll(true); that.loadCheckin() }
      })
    })
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab, page: 1, records: [], hasMore: true })
    this.loadAll(true)
  },

  loadAll: function (reset) {
    var that = this
    this.setData({ loading: true })
    var page = reset ? 1 : this.data.page
    Promise.all([
      api.get('/api/points/list', { page: page, pageSize: this.data.pageSize }),
      api.get('/api/points/shop')
    ]).then(function (res) {
      var mapped = res[0].list.map(function (r) {
        return Object.assign({}, r, {
          typeName: TYPE_NAMES[r.type] || '其他',
          isAdd: r.points > 0,
          timeText: fmt.fromNow(r.createTime)
        })
      })
      var records = reset ? mapped : that.data.records.concat(mapped)
      that.setData({
        balance: res[0].balance,
        records: records,
        shops: res[1].shops,
        hasMore: res[0].hasMore,
        page: page,
        loading: false
      })
    }).catch(function () { that.setData({ loading: false }) })
  },

  onReachBottom: function () {
    if (this.data.tab === 'detail' && this.data.hasMore && !this.data.loading) {
      this.setData({ page: this.data.page + 1 })
      this.loadAll(false)
    }
  },

  exchange: function (e) {
    var id = e.currentTarget.dataset.id
    var shop = this.data.shops.filter(function (s) { return s.id === id })[0]
    var that = this
    wx.showModal({
      title: '确认兑换',
      content: '消耗 ' + shop.cost + ' 积分兑换「' + shop.name + '」？',
      confirmText: '确认兑换',
      confirmColor: '#e93b3d',
      success: function (res) {
        if (!res.confirm) return
        api.post('/api/points/exchange', { shopId: id }).then(function (data) {
          wx.showModal({
            title: '兑换成功',
            content: '「' + shop.name + '」已放入账户，当前积分 ' + data.balance,
            showCancel: false,
            confirmColor: '#e93b3d',
            success: function () { that.loadAll(true) }
          })
        }).catch(function () {})
      }
    })
  }
})
