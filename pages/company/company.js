// pages/company/company.js —— 关于我们 / 店铺主页（评分展示 + 配送说明）
var api = require('../../utils/api.js')

Page({
  data: { info: null, loading: true },

  onShow: function () {
    var that = this
    api.get('/api/shop/info').then(function (data) {
      that.setData({ info: data, loading: false })
    }).catch(function () { that.setData({ loading: false }) })
  }
})
