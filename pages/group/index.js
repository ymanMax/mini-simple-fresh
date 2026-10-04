// pages/group/index.js —— 拼团活动 + 我的拼团
var api = require('../../utils/api.js')
var toast = require('../../utils/toast.js')

Page({
  data: { tab: 'active', active: [], mine: [], loading: true },

  onShow: function () {
    this.loadData()
  },

  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab, loading: true })
    this.loadData()
  },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([
      api.get('/api/group/list'),
      api.get('/api/group/my')
    ]).then(function (res) {
      that.setData({
        active: res[0].list,
        mine: res[1].list,
        loading: false
      })
    }).catch(function () { that.setData({ loading: false }) })
  },

  join: function (e) {
    var id = e.currentTarget.dataset.id
    var that = this
    api.post('/api/group/join', { groupId: id }).then(function (data) {
      wx.showModal({
        title: data.formed ? '拼团成功！' : '参团成功！',
        content: data.formed
          ? '已凑齐 ' + data.requiredCount + ' 人，拼团成立，可在订单中查看'
          : '还需 ' + (data.requiredCount - data.joinedCount) + ' 人成团，快分享给好友吧',
        showCancel: false,
        confirmColor: '#e93b3d',
        success: function () { that.loadData() }
      })
    })
  },

  goDetail: function (e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.currentTarget.dataset.gid })
  }
})
