// utils/toast.js —— 统一 toast / modal / loading 封装

function toast(title, icon) {
  wx.showToast({ title: title, icon: icon || 'none', duration: 1800 })
}
function success(title) { wx.showToast({ title: title || '操作成功', icon: 'success', duration: 1800 }) }
function loading(title) { wx.showLoading({ title: title || '加载中...', mask: true }) }
function hideLoading() { wx.hideLoading() }
function modal(content, title) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '提示', content: content, showCancel: true,
      success: function (res) { resolve(res.confirm) }
    })
  })
}
function alert(content, title) {
  wx.showModal({ title: title || '提示', content: content, showCancel: false })
}

module.exports = { toast: toast, success: success, loading: loading, hideLoading: hideLoading, modal: modal, alert: alert }
