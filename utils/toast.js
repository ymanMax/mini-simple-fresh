// 统一 toast / modal / loading 封装
function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none', duration: 1500 })
}
function success(title) {
  wx.showToast({ title: title || '操作成功', icon: 'success', duration: 1500 })
}
function loading(title) {
  wx.showLoading({ title: title || '加载中...', mask: true })
}
function hideLoading() {
  wx.hideLoading()
}
function confirm(content, title, confirmText) {
  return new Promise(function(resolve) {
    wx.showModal({
      title: title || '提示',
      content: content,
      confirmText: confirmText || '确定',
      cancelText: '取消',
      success: function(res) { resolve(!!res.confirm) },
      fail: function() { resolve(false) }
    })
  })
}
function alert(content, title) {
  wx.showModal({ title: title || '提示', content: content, showCancel: false })
}
module.exports = { toast: toast, success: success, loading: loading, hideLoading: hideLoading, confirm: confirm, alert: alert }
