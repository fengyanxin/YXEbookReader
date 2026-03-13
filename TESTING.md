# 电子书阅读器 - 本地测试指南

## 项目信息

**项目位置**：`~/Desktop/ebook-reader-mini`

## 测试步骤

### 1. 打开微信开发者工具

1. 启动微信开发者工具
2. 点击 "+" 或 "导入项目"

### 2. 导入项目

填写以下信息：
- **项目目录**：选择 `~/Desktop/ebook-reader-mini` 文件夹
- **项目名称**：电子书阅读器
- **AppID**：选择"测试号"或输入您的 AppID

### 3. 处理图标问题（重要！）

由于项目未包含图标文件，有两个解决方案：

#### 方案A：添加图标文件
在 `images/` 目录下添加以下图标：
- `bookshelf.png` (81×81px, 灰色)
- `bookshelf-active.png` (81×81px, 蓝色)
- `upload.png` (81×81px, 灰色)
- `upload-active.png` (81×81px, 蓝色)
- `settings.png` (81×81px, 灰色)
- `settings-active.png` (81×81px, 蓝色)

#### 方案B：临时移除 TabBar
编辑 `app.json`，注释掉 `tabBar` 部分：

```json
{
  "pages": [
    "pages/index/index",
    "pages/upload/upload",
    "pages/reader/reader",
    "pages/settings/settings"
  ],
  "window": {
    "backgroundTextStyle": "light",
    "navigationBarBackgroundColor": "#2c3e50",
    "navigationBarTitleText": "电子书阅读器",
    "navigationBarTextStyle": "white",
    "backgroundColor": "#f5f7fa"
  }
  // 临时注释掉 tabBar
  // "tabBar": { ... }
}
```

### 4. 编译运行

点击工具栏的"编译"按钮

### 5. 测试功能

#### 测试书架页面
- [ ] 页面正常显示
- [ ] 空状态提示显示正确
- [ ] 点击"上传书籍"按钮跳转

#### 测试上传功能
1. 准备一个 TXT 文件（测试用）
2. 点击上传区域选择文件
3. 填写书籍信息
4. 保存后查看书架

#### 测试阅读功能
1. 在书架中点击书籍
2. 测试翻页功能
3. 测试设置调整（字体、主题等）
4. 测试进度保存

#### 测试设置功能
- [ ] 字体大小调节
- [ ] 主题切换
- [ ] 其他设置项

### 6. 调试

如果遇到问题：
1. 打开"调试器"查看 Console 日志
2. 检查 Network 请求
3. 查看 AppData 状态

## 常见问题

### Q: TabBar 不显示
A: 检查图标文件是否存在，或按照方案B临时移除 TabBar 配置

### Q: 上传文件失败
A: 确保文件格式正确（支持 EPUB、PDF、TXT、MOBI、AZW）

### Q: 阅读器显示空白
A: TXT 文件需要包含文本内容，EPUB/PDF 需要进一步解析

### Q: 设置不生效
A: 检查控制台是否有错误，确保数据正常保存

## 项目文件清单

```
ebook-reader-mini/
├── app.js                  ✅ 小程序入口
├── app.json                ✅ 全局配置
├── app.wxss                ✅ 全局样式
├── project.config.json     ✅ 项目配置
├── sitemap.json            ✅ 站点地图
├── README.md               ✅ 项目说明
├── images/                 ⚠️ 需添加图标
│   └── README.md           ✅ 图标说明
├── pages/
│   ├── index/              ✅ 书架页面
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   ├── upload/             ✅ 上传页面
│   │   ├── upload.wxml
│   │   ├── upload.wxss
│   │   ├── upload.js
│   │   └── upload.json
│   ├── reader/             ✅ 阅读器页面
│   │   ├── reader.wxml
│   │   ├── reader.wxss
│   │   ├── reader.js
│   │   └── reader.json
│   └── settings/           ✅ 设置页面
│       ├── settings.wxml
│       ├── settings.wxss
│       ├── settings.js
│       └── settings.json
└── utils/
    ├── util.js             ✅ 通用工具
    └── parser.js           ✅ 解析工具
```

## 快速测试 TXT 文件

创建一个测试用 `test.txt` 文件：

```
第一章 开始

这是测试文本内容。

电子书阅读器小程序支持多种格式，
为您提供舒适的阅读体验。

您可以调整字体大小、切换主题、
自定义阅读背景。

感谢您的使用！
```

祝测试顺利！
