const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

Page({
  data: { addresses: [], selectMode: false, loading: true },

  onLoad(options) { this.setData({ selectMode: options.select === '1' }) },
  onShow() { this.load() },

  load() {
    api.addresses().then(list => { this.setData({ addresses: list, loading: false }) })
      .catch(() => this.setData({ loading: false }))
  },

  pickAddress(e) {
    if (!this.data.selectMode) return
    const id = e.currentTarget.dataset.id
    const addr = this.data.addresses.find(a => a.id === id)
    wx.setStorageSync('fl_selected_address', addr)
    wx.navigateBack()
  },
  edit(e) { wx.navigateTo({ url: '/pages/address/edit?id=' + e.currentTarget.dataset.id }) },
  add() { wx.navigateTo({ url: '/pages/address/edit' }) },
  setDefault(e) {
    api.setDefaultAddress(e.currentTarget.dataset.id).then(() => { toast.success('已设为默认'); this.load() })
      .catch(err => toast.toast(err.message))
  },
  remove(e) {
    const id = e.currentTarget.dataset.id
    toast.confirm('确定删除该地址吗？', '删除地址').then(ok => {
      if (!ok) return
      api.deleteAddress(id).then(() => { toast.success('已删除'); this.load() })
        .catch(err => toast.toast(err.message))
    })
  }
})
