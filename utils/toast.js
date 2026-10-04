// 统一 toast / loading / 弹窗封装，所有页面错误均经此兜底，禁止页面裸抛
function toast(title, icon) {
  wx.showToast({
    title: title || '操作成功',
    icon: icon || 'none',
    duration: 1800
  })
}

function success(title) {
  wx.showToast({ title: title || '成功', icon: 'success', duration: 1500 })
}

function showLoading(title) {
  wx.showLoading({ title: title || '加载中...', mask: true })
}

function hideLoading() {
  wx.hideLoading()
}

// Promise 化确认弹窗
function confirm(content, title) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '提示',
      content: content,
      confirmText: '确定',
      cancelText: '取消',
      success: function (res) {
        resolve(!!res.confirm)
      },
      fail: function () {
        resolve(false)
      }
    })
  })
}

function alert(content, title) {
  return new Promise(function (resolve) {
    wx.showModal({
      title: title || '提示',
      content: content,
      showCancel: false,
      success: function () { resolve(true) },
      fail: function () { resolve(false) }
    })
  })
}

// 全局 try/catch 包裹：页面请求回调统一使用
function wrap(fn) {
  return function () {
    try {
      return fn.apply(this, arguments)
    } catch (e) {
      console.error(e)
      toast('网络异常，请稍后重试')
    }
  }
}

module.exports = {
  toast: toast,
  success: success,
  showLoading: showLoading,
  hideLoading: hideLoading,
  confirm: confirm,
  alert: alert,
  wrap: wrap
}
