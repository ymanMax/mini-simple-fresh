const api = require('../../utils/api.js')
const toast = require('../../utils/toast.js')

Page({
  data: {
    id: null, form: { name: '', phone: '', province: '北京市', city: '北京市', district: '', detail: '', tag: '家', isDefault: false },
    tags: ['家', '学校', '公司'], loading: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id })
      api.addresses().then(list => {
        const addr = list.find(a => a.id === Number(options.id))
        if (addr) this.setData({ form: Object.assign({}, addr) })
      })
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
  },
  pickTag(e) { this.setData({ 'form.tag': e.currentTarget.dataset.tag }) },
  toggleDefault() { this.setData({ 'form.isDefault': !this.data.form.isDefault }) },

  save() {
    const f = this.data.form
    if (!f.name.trim()) { toast.toast('请填写收货人姓名'); return }
    if (!/^1\d{10}$/.test(f.phone)) { toast.toast('手机号格式不正确'); return }
    if (!f.district.trim() || !f.detail.trim()) { toast.toast('请填写完整详细地址'); return }
    this.setData({ loading: true })
    api.saveAddress(Object.assign({}, f, { id: this.data.id })).then(() => {
      toast.success('保存成功')
      setTimeout(() => wx.navigateBack(), 800)
    }).catch(err => { this.setData({ loading: false }); toast.toast(err.message || '保存失败') })
  }
})
