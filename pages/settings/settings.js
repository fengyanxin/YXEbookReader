// pages/settings/settings.js
const app = getApp()

Page({
  data: {
    settings: {},
    fontSizeSheetShow: false,
    themeSheetShow: false,
    fontFamilyName: '系统默认',
    backgroundTypeName: '纯色背景',
    pageEffectName: '滑动',
    storageUsed: '计算中...',
    statusBarHeight: 44
  },

  onLoad() {
    // 获取状态栏高度
    this.setData({
      statusBarHeight: app.getStatusBarHeightInRpx()
    });

    this.loadSettings();
    this.calculateStorage();
  },

  onShow() {
    // 重新加载设置以获取最新状态
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    const settings = app.globalData.settings;

    this.setData({
      settings,
      fontFamilyName: this.getFontFamilyName(settings.fontFamily),
      backgroundTypeName: this.getBackgroundTypeName(settings.backgroundType),
      pageEffectName: this.getPageEffectName(settings.pageEffect)
    });
  },

  // 获取字体名称
  getFontFamilyName(font) {
    const names = {
      'system': '系统默认',
      'serif': '衬线体',
      'sans-serif': '无衬线',
      'monospace': '等宽字体'
    };
    return names[font] || '系统默认';
  },

  // 获取背景类型名称
  getBackgroundTypeName(type) {
    const names = {
      'solid': '纯色背景',
      'image': '图片背景'
    };
    return names[type] || '纯色背景';
  },

  // 获取翻页效果名称
  getPageEffectName(effect) {
    const names = {
      'slide': '滑动',
      'fade': '淡入淡出',
      'none': '无效果'
    };
    return names[effect] || '滑动';
  },

  // 计算存储空间
  calculateStorage() {
    try {
      const info = wx.getStorageInfoSync();
      const currentSize = info.currentSize;
      const limitSize = info.limitSize;

      if (currentSize < 1024) {
        this.setData({ storageUsed: `${currentSize}KB` });
      } else {
        this.setData({ storageUsed: `${(currentSize / 1024).toFixed(1)}MB` });
      }
    } catch (e) {
      this.setData({ storageUsed: '未知' });
    }
  },

  // 打开字体大小设置
  openFontSizeSetting() {
    this.setData({ fontSizeSheetShow: true });
  },

  // 关闭字体大小设置
  closeFontSizeSheet() {
    this.setData({ fontSizeSheetShow: false });
  },

  // 设置字体大小
  setFontSize(e) {
    const size = parseInt(e.currentTarget.dataset.size);
    this.setData({
      'settings.fontSize': size
    });
    app.updateSettings({ fontSize: size });
  },

  // 字体大小滑块变化
  onFontSizeChange(e) {
    const size = e.detail.value;
    this.setData({
      'settings.fontSize': size
    });
    app.updateSettings({ fontSize: size });
  },

  // 打开字体设置
  openFontFamilySetting() {
    const fontFamilies = ['系统默认', '衬线体', '无衬线', '等宽字体'];
    wx.showActionSheet({
      itemList: fontFamilies,
      success: (res) => {
        const fonts = ['system', 'serif', 'sans-serif', 'monospace'];
        const selectedFont = fonts[res.tapIndex];
        this.setData({
          'settings.fontFamily': selectedFont,
          fontFamilyName: fontFamilies[res.tapIndex]
        });
        app.updateSettings({ fontFamily: selectedFont });
      }
    });
  },

  // 打开行间距设置
  openLineHeightSetting() {
    wx.showActionSheet({
      itemList: ['紧凑 (1.4)', '标准 (1.6)', '舒适 (1.8)', '宽松 (2.0)', '很宽 (2.4)'],
      success: (res) => {
        const lineHeights = [1.4, 1.6, 1.8, 2.0, 2.4];
        const selectedHeight = lineHeights[res.tapIndex];
        this.setData({
          'settings.lineHeight': selectedHeight
        });
        app.updateSettings({ lineHeight: selectedHeight });
      }
    });
  },

  // 打开主题设置
  openThemeSetting() {
    this.setData({ themeSheetShow: true });
  },

  // 关闭主题设置
  closeThemeSheet() {
    this.setData({ themeSheetShow: false });
  },

  // 设置主题
  setTheme(e) {
    const theme = e.currentTarget.dataset.theme;
    this.setData({
      'settings.theme': theme
    });
    app.updateSettings({ theme });

    wx.showToast({
      title: '主题已切换',
      icon: 'success'
    });
  },

  // 打开背景设置
  openBackgroundSetting() {
    wx.showActionSheet({
      itemList: ['纯色背景', '自定义图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.setData({
            'settings.backgroundType': 'solid',
            backgroundTypeName: '纯色背景'
          });
          app.updateSettings({ backgroundType: 'solid' });
        } else {
          this.chooseBackgroundImage();
        }
      }
    });
  },

  // 选择背景图片
  chooseBackgroundImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const imagePath = res.tempFilePaths[0];
        this.setData({
          'settings.backgroundType': 'image',
          'settings.backgroundImage': imagePath,
          backgroundTypeName: '图片背景'
        });
        app.updateSettings({
          backgroundType: 'image',
          backgroundImage: imagePath
        });
        wx.showToast({
          title: '背景已设置',
          icon: 'success'
        });
      }
    });
  },

  // 打开翻页效果设置
  openPageEffectSetting() {
    wx.showActionSheet({
      itemList: ['滑动', '淡入淡出', '无效果'],
      success: (res) => {
        const effects = ['slide', 'fade', 'none'];
        const effectNames = ['滑动', '淡入淡出', '无效果'];
        const selectedEffect = effects[res.tapIndex];
        this.setData({
          'settings.pageEffect': selectedEffect,
          pageEffectName: effectNames[res.tapIndex]
        });
        app.updateSettings({ pageEffect: selectedEffect });
      }
    });
  },

  // 显示存储信息
  showStorageInfo() {
    try {
      const info = wx.getStorageInfoSync();
      const keys = info.keys;
      const currentSize = info.currentSize;
      const limitSize = info.limitSize;

      let sizeText = '';
      if (currentSize < 1024) {
        sizeText = `${currentSize}KB`;
      } else {
        sizeText = `${(currentSize / 1024).toFixed(1)}MB`;
      }

      wx.showModal({
        title: '存储空间详情',
        content: `已使用: ${sizeText}\n数据项数: ${keys.length}个`,
        showCancel: false
      });
    } catch (e) {
      wx.showToast({
        title: '获取存储信息失败',
        icon: 'none'
      });
    }
  },

  // 导出数据
  exportData() {
    const data = {
      books: app.globalData.books,
      settings: app.globalData.settings,
      exportTime: new Date().toISOString()
    };

    // 转换为JSON字符串
    const jsonStr = JSON.stringify(data, null, 2);

    // 复制到剪贴板
    wx.setClipboardData({
      data: jsonStr,
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '确认清除',
      content: '确定要清除所有缓存数据吗？这将删除所有书籍和设置。',
      confirmText: '清除',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.clearStorageSync();

            // 重置全局数据
            app.globalData.books = [];
            app.globalData.currentBook = null;
            app.globalData.settings = {
              fontSize: 18,
              fontFamily: 'system',
              theme: 'light',
              backgroundType: 'solid',
              backgroundImage: '',
              backgroundColor: '#ffffff',
              textColor: '#333333',
              pageEffect: 'slide',
              lineHeight: 1.8,
              paragraphSpacing: 20,
              margin: 15
            };

            this.loadSettings();
            this.calculateStorage();

            wx.showToast({
              title: '缓存已清除',
              icon: 'success'
            });
          } catch (e) {
            wx.showToast({
              title: '清除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 关于
  openAbout() {
    wx.showModal({
      title: '关于电子书阅读器',
      content: '版本: v1.0.0\n\n这是一款简洁优雅的电子书阅读应用，支持多种电子书格式，提供丰富的个性化阅读设置。\n\n享受阅读的乐趣！',
      showCancel: false
    });
  },

  // 帮助与反馈
  openHelp() {
    wx.showModal({
      title: '帮助与反馈',
      content: '如何使用：\n1. 点击"上传"添加电子书\n2. 在书架中选择书籍阅读\n3. 点击屏幕中央显示/隐藏控制栏\n4. 左右点击翻页\n5. 在设置中自定义阅读体验\n\n如遇问题，请联系开发者。',
      showCancel: false
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '电子书阅读器 - 享受阅读的乐趣',
      path: '/pages/index/index'
    };
  }
});
