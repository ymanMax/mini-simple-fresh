const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

Page({
  data: { list: [], loading: true },
  onLoad() { this.load() },
  onShow() { this.load() },
  load() {
    api.groupbuys().then(list => {
      const items = list.map(g => Object.assign({}, g, {
        groupPriceYuan: (g.groupPrice / 100).toFixed(2),
        originalPriceYuan: (g.originalPrice / 100).toFixed(2),
        statusText: g.status === 1 ? '拼团中' : (g.status === 2 ? '已成团' : '未成团已退款'),
        memberPics: (g.members || []).map(m => m.avatar)
      }))
      this.setData({ list: items, loading: false })
    }).catch(() => this.setData({ loading: false }))
  },
  join(e) {
    const id = e.currentTarget.dataset.id
    api.joinGroupbuy(id).then(() => { toast.success('拼团成功'); this.load() })
      .catch(err => toast.toast(err.message || '参与失败'))
  },
  goDetail(e) { wx.navigateTo({ url: '/pages/detail/detail?sku=' + e.currentTarget.dataset.sku }) }
})
