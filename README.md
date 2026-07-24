# Komari Glass

自用毛玻璃主题，适配 **Komari Monitor 1.3.0**。

技术栈：`bun` + `TypeScript` + `React` + `Next.js`（静态导出）。

## 界面结构

1. **顶部栏**：左侧站点 Logo + 名称；右侧深/浅主题切换、后台入口
2. **总览条**：**在线**（在线/总数）+ **资产**（总价值 / 剩余价值）；流量与网速可选
3. **服务器卡片**（Glass 风格）：在线天数 + 价格；CPU/内存/硬盘/流量；网速 / 总流量 / 剩余天数+剩余价值；底部延迟与丢包柱
4. **详情页**：点击卡片进入 `/instance/:uuid`（参考 Purcarte）

## 开发

```bash
# 安装依赖
bun install

# 本地开发（需代理到 Komari 后端，见下方）
bun run dev
```

开发时如需对接真实后端，可在本机启动 Komari，并使用 Next rewrites，或在浏览器直接访问已部署站点的 API（同源）。

更推荐：把构建产物上传到你的 Komari 实例验证。

### 对接本地 Komari

默认 API 走同源 `/api/*`。开发服务器可用环境变量配合反向代理；也可临时修改浏览器 Host，或用 Caddy/nginx 把主题 dev server 挂到 Komari 同域。

## 构建与安装

```bash
bun run build
```

会生成：

- `dist/` — 静态站点（含 `index.html`）
- `komari-theme-glass-v*.zip` — 可直接上传到 Komari 的主题包

在 Komari 后台：**主题 → 上传 ZIP → 启用 `Glass`**。

### ZIP 结构

```
komari-theme-glass-v1.0.0-xxx.zip
├── komari-theme.json
├── preview.png
└── dist/
    ├── index.html
    └── ...
```

## 主题配置

后台「Glass 主题设置」可配置：

| 配置项 | 说明 |
| --- | --- |
| 站点 Logo URL | 顶部左侧 Logo |
| 默认主题模式 | system / light / dark |
| 启用毛玻璃效果 | 开关 backdrop-filter |
| 背景图片 URL | 支持 `浅色\|深色` |
| 显示总览统计条 | 总开关 |
| 显示在线 | 在线 / 总数 |
| 显示资产 | 总价值 / 剩余价值 |
| 显示累计流量 / 实时网速 | 可选附加卡片 |
| 离线节点置底 | 卡片排序 |
| 未登录隐藏后台入口 | 隐私选项 |

用户本地的 `localStorage.appearance` 会覆盖默认主题模式（与官方约定字段一致）。

## 兼容性

- 目标服务端：**Komari 1.3.0**
- 数据接口：`/api/public`、`/api/nodes`、`/api/me`、`/api/clients`（WS）、`/api/records/*`
- 特殊路径不接管：`/admin`、`/terminal` 仍由官方界面处理
- 页脚保留：`Powered by Komari Monitor.`

## License

MIT
