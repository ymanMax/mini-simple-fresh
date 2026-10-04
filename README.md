# 鲜生活小程序

微信小程序项目，主要使用微信原生 API 实现。

## 项目简介

鲜生活是一个生鲜/生活服务类小程序，提供商品浏览、详情查看、搜索、下单、会员中心和个人中心等常用功能，可作为微信小程序开发的参考示例。

## 功能特性

- 商品列表浏览
- 商品详情查看
- 搜索功能
- 下单与订单确认
- 会员相关功能
- 个人中心
- 自定义下拉/箭头组件

## 项目结构

```
├── app.js                 # 小程序入口逻辑
├── app.json               # 小程序全局配置
├── app.wxss               # 小程序全局样式
├── project.config.json    # 项目配置
├── pages/                 # 页面
│   ├── index/             # 首页
│   ├── shop/              # 商品列表
│   ├── detail/            # 商品详情
│   ├── buy/               # 订单确认/支付
│   ├── search/            # 搜索
│   ├── me/                # 我的
│   ├── my/                # 个人中心相关
│   ├── vip/               # 会员
│   └── logs/              # 日志
├── component/             # 自定义组件
│   └── arrdow/            # 下拉/箭头组件
├── utils/                 # 工具函数
│   └── util.js
├── images/                # 本地图片资源
│   └── icons/
└── https/                 # 本地 mock 服务
    ├── server.js          # 后端服务入口
    ├── data/              # 模拟数据
    │   ├── data.json
    │   ├── detail.json
    │   ├── me.json
    │   ├── orders.json
    │   ├── searchMsg.json
    │   ├── test.json
    │   └── vip.json
    └── ssl/               # SSL 证书
        ├── csr.pem
        ├── file.crt
        └── private.pem
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 mock 服务

```bash
node https/server.js
```

### 3. 导入微信开发者工具

- 使用微信开发者工具打开项目目录
- 编译预览

## 技术栈

- 微信小程序原生框架
- 微信原生 API
