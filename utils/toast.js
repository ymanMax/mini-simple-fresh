// utils/toast.js —— 统一 toast / modal / loading 封装

function toast(title, icon) {
  wx.showToast({
    title: title,
    icon: icon || 'none',
    duration: 1800
  })
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

// 确认弹窗，confirm 回调
function confirm(content, confirmText, cb) {
  wx.showModal({
    title: '提示',
    content: content,
    showCancel: true,
    cancelText: '取消',
    confirmText: confirmText || '确定',
    confirmColor: '#e93b3d',
    success: function (res) {
      if (res.confirm && cb) cb()
    }
  })
}

// 模拟支付：2 秒 loading 后成功回调
function mockPay(payAmountYuan, cb) {
  wx.showLoading({ title: '支付中...', mask: true })
  setTimeout(function () {
    wx.hideLoading()
    wx.showModal({
      title: '支付成功',
      content: '实付 ' + payAmountYuan + ' 元（演示环境，不产生真实交易）',
      showCancel: false,
      confirmText: '完成',
      confirmColor: '#e93b3d',
      success: function () {
        if (cb) cb()
      }
    })
  }, 2000)
}

module.exports = {
  toast: toast,
  success: success,
  loading: loading,
  hideLoading: hideLoading,
  confirm: confirm,
  mockPay: mockPay
}
