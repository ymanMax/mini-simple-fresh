const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')
const dec = require('../../utils/decorate.js')

Page({
  data: { goods: [], loading: true },
  onShow() { this.load() },
  load() {
    api.favorites().then(list => {
      this.setData({ goods: list.map(dec.goods), loading: false })
    }).catch(() => this.setData({ loading: false }))
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) },
  remove(e) {
    const sku = e.currentTarget.dataset.sku
    toast.confirm('取消收藏该商品？', '取消收藏').then(ok => {
      if (!ok) return
      api.toggleFavorite(sku).then(() => { toast.success('已取消收藏'); this.load() })
        .catch(err => toast.toast(err.message))
    })
  },
  goHome() { wx.switchTab({ url: '/pages/index/index' }) }
})
