// pages/company/company.js 公司简介 / 店铺主页 / 配送说明 / 店铺评价
var api = require('../../utils/api.js')
var F = require('../../utils/format.js')
var toast = require('../../utils/toast.js')
var img = require('../../utils/img.js')

Page({
  data: {
    section: 'about', // about / review / delivery
    reviews: [],
    loading: true,
    DEFAULT_IMG: api.DEFAULT_IMG
  },

  onLoad: function (options) {
    if (options.section) this.setData({ section: options.section })
  },

  onShow: function () {
    this.loadReviews()
  },

  loadReviews: function () {
    var that = this
    api.getReviews().then(function (list) {
      var reviews = (list || []).slice(0, 8).map(function (r) {
        return Object.assign({}, r, { timeText: F.formatTime(r.createTime) })
      })
      that.setData({ reviews: reviews, loading: false })
    })
  },

  switchSection: function (e) {
    this.setData({ section: e.currentTarget.dataset.section })
  },

  goHome: function () { wx.switchTab({ url: '/pages/index/index' }) },

  onImgError: function (e) { img.make(this)(e) }
})
