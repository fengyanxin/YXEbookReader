# 电子书阅读器微信小程序

一款功能完整、界面优雅的电子书阅读微信小程序，支持多种电子书格式的上传与阅读。

## 功能特性

### 📚 书籍管理
- 支持多种格式：EPUB、PDF、MOBI、AZW、TXT
- 书架展示：封面、书名、作者、阅读进度
- 书籍信息编辑：自定义封面、书名、作者、简介
- 删除书籍：长按显示删除按钮

### 📖 阅读功能
- 流畅的阅读体验
- 点击左右翻页，点击中央显示/隐藏控制栏
- 阅读进度自动保存
- 书签功能
- 章节导航

### ⚙️ 个性化设置
- **字体设置**：6种预设大小 + 滑动调节
- **字体选择**：系统默认、衬线体、无衬线、等宽字体
- **行间距**：5种预设行距
- **阅读主题**：明亮、护眼、夜间、绿色
- **背景设置**：纯色背景、自定义图片背景
- **翻页效果**：滑动、淡入淡出、无效果

### 🎨 界面设计
- 现代简约风格
- 渐变色背景设计
- 流畅的动画过渡
- 响应式布局
- 优雅的空状态提示

## 项目结构

```
ebook-reader-mini/
├── pages/                  # 页面目录
│   ├── index/             # 书架页面
│   │   ├── index.wxml
│   │   ├── index.wxss
│   │   ├── index.js
│   │   └── index.json
│   ├── upload/            # 上传页面
│   │   ├── upload.wxml
│   │   ├── upload.wxss
│   │   ├── upload.js
│   │   └── upload.json
│   ├── reader/            # 阅读器页面
│   │   ├── reader.wxml
│   │   ├── reader.wxss
│   │   ├── reader.js
│   │   └── reader.json
│   └── settings/          # 设置页面
│       ├── settings.wxml
│       ├── settings.wxss
│       ├── settings.js
│       └── settings.json
├── utils/                 # 工具函数
│   ├── util.js
│   └── parser.js
├── images/                # 图片资源
│   ├── bookshelf.png
│   ├── bookshelf-active.png
│   ├── upload.png
│   ├── upload-active.png
│   ├── settings.png
│   └── settings-active.png
├── app.js                 # 小程序入口
├── app.json               # 小程序配置
├── app.wxss               # 全局样式
├── project.config.json    # 项目配置
└── sitemap.json           # 站点地图
```

## 快速开始

### 1. 安装微信开发者工具

下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)

### 2. 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择项目目录：`ebook-reader-mini`
4. 填写项目名称和 AppID（可使用测试号）

### 3. 准备图标资源

由于版权原因，项目未包含图标文件。您需要准备以下图标：

```
images/
├── bookshelf.png          # 书架图标（未选中）
├── bookshelf-active.png   # 书架图标（选中）
├── upload.png             # 上传图标（未选中）
├── upload-active.png      # 上传图标（选中）
├── settings.png           # 设置图标（未选中）
└── settings-active.png    # 设置图标（选中）
```

图标规格建议：
- 尺寸：81px × 81px
- 格式：PNG
- 背景透明

或者可以暂时注释掉 `app.json` 中的 `tabBar` 配置来测试。

### 4. 运行项目

点击"编译"按钮即可在模拟器中预览项目。

## 使用说明

### 添加书籍

1. 点击底部"上传"标签
2. 点击上传区域选择文件
3. 支持 EPUB、PDF、TXT 等格式
4. 编辑书籍信息（可选）
5. 保存到书架

### 阅读书籍

1. 在书架中点击书籍封面
2. 进入阅读界面
3. 点击屏幕中央显示/隐藏控制栏
4. 点击左右区域翻页
5. 点击"设置"按钮调整阅读参数

### 调整设置

1. 点击底部"设置"标签
2. 选择要调整的项目
3. 实时预览效果

## 技术栈

- **框架**：微信小程序原生框架
- **语言**：WXML、WXSS、JavaScript
- **存储**：wx.setStorageSync/wx.getStorageSync
- **文件系统**：wx.getFileSystemManager

## 浏览器兼容性

本程序为微信小程序，无需考虑浏览器兼容性。

## 注意事项

1. **EPUB/PDF 解析**：当前版本对 EPUB 和 PDF 格式做了简化处理，完整解析需要引入第三方库（如 jszip、pdf.js）

2. **文件大小限制**：微信小程序对本地存储有大小限制，建议单个文件不超过 50MB

3. **图标资源**：请自行添加底部导航栏图标，或暂时注释掉 tabBar 配置

4. **测试 AppID**：开发时可使用测试号，正式发布需要申请正式 AppID

## 开发计划

- [ ] 完善 EPUB 解析功能
- [ ] 添加 PDF 渲染支持
- [ ] 实现全文搜索
- [ ] 添加朗读功能
- [ ] 支持云端同步
- [ ] 添加阅读统计

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请在 GitHub 上提 Issue。
