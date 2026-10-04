// pages/shop-info/index.js —— 店铺主页 / 店铺评价 / 配送说明 / 我的拼团（按 section 参数切换）
var mixin = require('../../utils/mixin.js')
var api = mixin.api

Page({
  data: {
    loading: true,
    section: 'shop', // shop | review | delivery | group
    shop: { name: '每日优鲜旗舰店', score: 4.8, sales: '100万+', location: '北京市朝阳区望京', fans: '50万+' },
    reviews: [],
    groupBuy: [],
    seckill: null,
    fullReduce: null
  },

  onLoad: function (options) {
    this.setData({ section: options.section || 'shop' })
  },
  onShow: function () { this.loadData() },

  loadData: function () {
    var that = this
    this.setData({ loading: true })
    api.getPromotions().then(function (p) {
      var db = api.loadDB()
      // 秒杀商品解析为商品名
      var seckillGoods = p.seckill.seckillGoods.map(function (sg) {
        var g = db.goods.filter(function (x) { return x.id === sg.goodsId })[0]
        return Object.assign({}, sg, { name: g ? g.name : sg.goodsId, pic: g ? g.pic : '/images/default.png' })
      })
      var seckill = Object.assign({}, p.seckill, { seckillGoods: seckillGoods })
      var shopReviews = db.reviews.slice(0, 8).map(function (r) {
        return {
          id: r.id, userName: r.userName, avatar: r.avatar, score: r.score,
          fresh: 5, speed: 4, package: 5, content: r.content, createTime: r.createTime
        }
      })
      that.setData({
        loading: false, promotions: p, groupBuy: p.groupBuy,
        seckill: seckill, fullReduce: p.fullReduce, reviews: shopReviews
      })
    })
  },

  // 拼团：开团/参团
  joinGroup: function (e) {
    var id = e.currentTarget.dataset.id
    var gb = this.data.groupBuy.filter(function (g) { return g.id === id })[0]
    if (!gb) return
    wx.showModal({
      title: '参加拼团',
      content: gb.name + '，拼团价 ¥' + (gb.groupPrice / 100).toFixed(2) + '（原价 ¥' + (gb.originalPrice / 100).toFixed(2) + '），' + gb.rules,
      confirmText: '立即参团',
      success: function (res) {
        if (res.confirm) wx.showToast({ title: '参团成功，等待成团', icon: 'success' })
      }
    })
  },

  onImgError: mixin.onImgError
})
