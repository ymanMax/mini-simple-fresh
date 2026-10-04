// 公司简介 / 店铺主页 / 店铺评价 / 配送说明（合并为一个页面，按 tab 切换）
const seed = require('../../utils/mock/seed.js')

Page({
  data: {
    tab: 'about',
    reviews: [], loading: false,
    scores: { fresh: 4.9, speed: 4.8, package: 4.9, overall: 4.9 }
  },

  onLoad(options) {
    if (options.tab) this.setData({ tab: options.tab })
    this.loadReviews()
  },
  onShow() { this.loadReviews() },

  setTab(e) { this.setData({ tab: e.currentTarget.dataset.tab }) },

  loadReviews() {
    const userReviews = wx.getStorageSync('fl_userReviews')
    const all = (Array.isArray(userReviews) ? userReviews : []).concat(seed.reviews || [])
    this.setData({ reviews: all.slice(0, 12) })
  },

  callService() {
    wx.showModal({ title: '联系客服', content: '客服热线：400-888-9999\n在线时间：9:00-22:00\n演示环境，不产生真实通话。', showCancel: false })
  }
})
