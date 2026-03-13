// app.js
App({
  globalData: {
    userInfo: null,
    books: [],
    currentBook: null,
    systemInfo: null,
    statusBarHeight: 44,
    safeArea: null,
    settings: {
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
    }
  },

  onLaunch: function() {
    // 从本地存储加载数据
    this.loadFromStorage();

    // 获取系统信息（包含安全区域信息）
    this.getSystemInfo();
  },

  // 获取系统信息
  getSystemInfo: function() {
    var self = this;
    wx.getSystemInfo({
      success: function(res) {
        self.globalData.systemInfo = res;

        // 获取状态栏高度
        self.globalData.statusBarHeight = res.statusBarHeight || 44;

        // 获取安全区域信息
        self.globalData.safeArea = res.safeArea || {
          top: res.statusBarHeight || 44,
          bottom: res.windowHeight
        };
      },
      fail: function(err) {
        console.error('获取系统信息失败', err);
      }
    });
  },

  // 判断是否为刘海屏
  isNotchScreen: function() {
    var systemInfo = this.globalData.systemInfo;
    if (!systemInfo) return false;

    var model = systemInfo.model.toLowerCase();
    var notchModels = [
      'iphone x', 'iphone xs', 'iphone xs max', 'iphone xr',
      'iphone 11', 'iphone 11 pro', 'iphone 11 pro max',
      'iphone 12', 'iphone 12 pro', 'iphone 12 pro max', 'iphone 12 mini',
      'iphone 13', 'iphone 13 pro', 'iphone 13 pro max', 'iphone 13 mini',
      'iphone 14', 'iphone 14 pro', 'iphone 14 pro max', 'iphone 14 plus',
      'iphone 15', 'iphone 15 pro', 'iphone 15 pro max', 'iphone 15 plus'
    ];

    // 通过安全区域判断更准确
    var safeArea = this.globalData.safeArea;
    if (safeArea && systemInfo.windowHeight - safeArea.bottom > 0) {
      return true;
    }

    for (var i = 0; i < notchModels.length; i++) {
      if (model.indexOf(notchModels[i]) > -1) {
        return true;
      }
    }

    return false;
  },

  // 获取状态栏高度（px）
  getStatusBarHeight: function() {
    return this.globalData.statusBarHeight || 44;
  },

  // 获取状态栏高度（rpx）
  getStatusBarHeightInRpx: function() {
    var systemInfo = this.globalData.systemInfo;
    if (!systemInfo) return 44;

    var screenWidth = systemInfo.screenWidth;
    var statusBarHeight = this.globalData.statusBarHeight || 44;
    return (statusBarHeight / screenWidth) * 750;
  },

  // 从本地存储加载数据
  loadFromStorage: function() {
    try {
      var books = wx.getStorageSync('books');
      if (books) {
        this.globalData.books = books;
      }

      var settings = wx.getStorageSync('settings');
      if (settings) {
        for (var key in settings) {
          this.globalData.settings[key] = settings[key];
        }
      }

      var currentBook = wx.getStorageSync('currentBook');
      if (currentBook) {
        this.globalData.currentBook = currentBook;
      }
    } catch (e) {
      console.error('加载数据失败', e);
    }
  },

  // 保存数据到本地存储
  saveToStorage: function() {
    try {
      wx.setStorageSync('books', this.globalData.books);
      wx.setStorageSync('settings', this.globalData.settings);
      if (this.globalData.currentBook) {
        wx.setStorageSync('currentBook', this.globalData.currentBook);
      }
    } catch (e) {
      console.error('保存数据失败', e);
    }
  },

  // 添加书籍
  addBook: function(book) {
    this.globalData.books.push(book);
    this.saveToStorage();
  },

  // 删除书籍
  removeBook: function(bookId) {
    var newBooks = [];
    for (var i = 0; i < this.globalData.books.length; i++) {
      if (this.globalData.books[i].id !== bookId) {
        newBooks.push(this.globalData.books[i]);
      }
    }
    this.globalData.books = newBooks;
    this.saveToStorage();
  },

  // 更新书籍阅读进度
  updateBookProgress: function(bookId, progress) {
    for (var i = 0; i < this.globalData.books.length; i++) {
      if (this.globalData.books[i].id === bookId) {
        this.globalData.books[i].progress = progress;
        this.globalData.books[i].lastReadTime = new Date().getTime();
        break;
      }
    }
    this.saveToStorage();
  },

  // 获取书籍
  getBook: function(bookId) {
    for (var i = 0; i < this.globalData.books.length; i++) {
      if (this.globalData.books[i].id === bookId) {
        return this.globalData.books[i];
      }
    }
    return null;
  },

  // 更新设置
  updateSettings: function(settings) {
    for (var key in settings) {
      this.globalData.settings[key] = settings[key];
    }
    this.saveToStorage();
  }
});
