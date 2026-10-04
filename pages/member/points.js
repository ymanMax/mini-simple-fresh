// pages/member/points.js 积分明细 + 兑换
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

var GIFTS = [
  { id: 1, name: '¥5无门槛券', points: 100, coupon: { name: '¥5无门槛券', type: 3, threshold: 0, discount: 5, scope: '全场通用' } },
  { id: 2, name: '水果叉套装', points: 300, coupon: null },
  { id: 3, name: '¥30满99可用券', points: 500, coupon: { name: '满99减30券', type: 1, threshold: 99, discount: 30, scope: '全场通用' } },
  { id: 4, name: '当季水果3斤装', points: 880, coupon: null }
]

var TYPE_TEXT = { 1: '购物', 2: '签到', 3: '评价', 4: '兑换消耗', 5: '生日赠送' }

Page({
  data: {
    records: [],
    gifts: GIFTS,
    member: null,
    activeTab: 'record', // record / exchange
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onShow: function () {
    this.load()
  },

  load: function () {
    var that = this
    Promise.all([api.getPointsRecords(), api.getMember()]).then(function (results) {
      var records = (results[0] || []).map(function (r) {
        return Object.assign({}, r, {
          typeText: TYPE_TEXT[r.type] || '积分',
          timeText: F.formatTime(r.createTime),
          sign: r.points > 0 ? '+' : ''
        })
      })
      that.setData({ records: records, member: results[1], loading: false })
    })
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  exchange: function (e) {
    var id = e.currentTarget.dataset.id
    var gift = GIFTS.filter(function (g) { return g.id === id })[0]
    if (!gift) return
    var that = this
    toast.confirm('确定使用 ' + gift.points + ' 积分兑换「' + gift.name + '」？').then(function (ok) {
      if (!ok) return
      api.exchange(gift).then(function (res) {
        if (res.ok) {
          toast.success('兑换成功')
          that.load()
        } else {
          toast.toast(res.msg || '兑换失败，积分不足')
        }
      })
    })
  },

  onImgError: function (e) { img.make(this)(e) }
})
