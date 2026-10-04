const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

Page({
  data: {
    mainTab: 'center', // center | my
    myTab: 1, // 1未使用 2已使用 3已过期
    center: [], myCoupons: [], loading: true
  },

  onLoad(options) {
    if (options.tab === 'my') this.setData({ mainTab: 'my' })
    this.loadAll()
  },
  onShow() { this.loadAll() },

  loadAll() {
    Promise.all([api.couponCenter(), api.myCoupons(this.data.myTab)]).then(([center, my]) => {
      const decorate = c => Object.assign({}, c, {
        discountText: c.type === 2 ? (c.discount / 10).toFixed(1) + '折' : (c.discount / 100).toFixed(2) + '元',
        conditionText: c.threshold > 0 ? '满' + (c.threshold / 100).toFixed(2) + '元可用' : '无门槛',
        expireShort: (c.expireTime || '').slice(0, 10)
      })
      this.setData({ center: center.map(decorate), myCoupons: my.map(decorate), loading: false })
    }).catch(() => this.setData({ loading: false }))
  },

  setMainTab(e) { this.setData({ mainTab: e.currentTarget.dataset.tab }); this.loadAll() },
  setMyTab(e) { this.setData({ myTab: Number(e.currentTarget.dataset.tab) }); this.loadAll() },

  claim(e) {
    const id = e.currentTarget.dataset.id
    api.claimCoupon(id).then(() => { toast.success('领取成功'); this.loadAll() })
      .catch(err => toast.toast(err.message || '领取失败'))
  },

  goUse(e) {
    // 去使用：跳商品分类/首页，或直接去购物车结算
    wx.switchTab({ url: '/pages/shop/shop' })
  }
})
