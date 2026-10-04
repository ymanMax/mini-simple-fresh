// pages/member/points.js —— 积分明细 + 积分兑换专区
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    member: null,
    records: [],
    gifts: [
      { id: 'ex1', name: '5元无门槛券', points: 100, desc: '全场通用，无门槛使用', pic: '/images/icons/money_bag.png' },
      { id: 'ex2', name: '水果叉套装', points: 300, desc: '不锈钢水果叉，4支装', pic: '/images/icons/tag.png' },
      { id: 'ex3', name: '30元满99可用券', points: 500, desc: '全场满99减30', pic: '/images/icons/card_bag.png' },
      { id: 'ex4', name: '当季水果3斤装', points: 880, desc: '时令鲜果组合礼盒', pic: '/images/icons/see.png' }
    ]
  },

  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    Promise.all([api.getMember(), api.getPointsRecords()]).then(function (res) {
      that.setData({ loading: false, member: res[0], records: res[1] })
    })
  },

  // 兑换（二次确认）
  exchange: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var gift = this.data.gifts.filter(function (g) { return g.id === id })[0]
    if (!gift) return
    wx.showModal({
      title: '确认兑换',
      content: '将消耗 ' + gift.points + ' 积分兑换「' + gift.name + '」，是否确认？',
      success: function (res) {
        if (res.confirm) {
          api.exchangeGood(id).then(function (r) {
            if (r.success) {
              wx.showModal({
                title: '兑换成功', content: r.msg + '，当前积分 ' + r.points,
                showCancel: false, success: function () { that.loadData() }
              })
            } else wx.showToast({ title: r.msg, icon: 'none' })
          })
        }
      }
    })
  },

  recordTypeText: function (t) {
    return ['', '购物', '签到', '评价', '兑换消耗', '生日赠送'][t] || '其他'
  },

  onImgError: mixin.onImgError
})
