// pages/index/index.js
const app = getApp()

Page({
  data: {
    books: [],
    showDeleteModal: false,
    deleteBookId: null,
    deleteBookTitle: '',
    statusBarHeight: 44
  },

  onLoad(options) {
    // 获取状态栏高度
    this.setData({
      statusBarHeight: app.getStatusBarHeightInRpx()
    });

    this.loadBooks();
  },

  onShow() {
    // 从阅读页返回时刷新列表
    this.loadBooks();
  },

  onPullDownRefresh() {
    this.loadBooks();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 加载书籍列表
  loadBooks() {
    var books = app.globalData.books || [];
    var processedBooks = [];

    for (var i = 0; i < books.length; i++) {
      var book = books[i];
      var processedBook = {
        id: book.id,
        title: book.title,
        author: book.author,
        cover: book.cover,
        format: book.format,
        content: book.content,
        localPath: book.localPath,
        fileSize: book.fileSize,
        addTime: book.addTime,
        lastReadTime: book.lastReadTime,
        progress: book.progress || 0,
        totalPages: book.totalPages,
        currentPage: book.currentPage || 0,
        lastReadTimeText: this.formatTime(book.lastReadTime)
      };
      processedBooks.push(processedBook);
    }

    // 按最后阅读时间排序
    processedBooks.sort(function(a, b) {
      return (b.lastReadTime || 0) - (a.lastReadTime || 0);
    });

    this.setData({ books: processedBooks });
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '未阅读';

    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    const week = 7 * day;

    if (diff < hour) {
      return '刚刚';
    } else if (diff < day) {
      return Math.floor(diff / hour) + '小时前';
    } else if (diff < week) {
      return Math.floor(diff / day) + '天前';
    } else if (diff < 30 * day) {
      return Math.floor(diff / week) + '周前';
    } else {
      const date = new Date(timestamp);
      return `${date.getMonth() + 1}月${date.getDate()}日`;
    }
  },

  // 点击书籍卡片
  onBookTap(e) {
    const book = e.currentTarget.dataset.book;
    app.globalData.currentBook = book;

    // 根据书籍类型跳转到相应页面
    if (book.format === 'PDF') {
      wx.navigateTo({
        url: `/pages/reader/reader?type=pdf&id=${book.id}`
      });
    } else {
      wx.navigateTo({
        url: `/pages/reader/reader?id=${book.id}`
      });
    }
  },

  // 删除书籍
  onDeleteBook(e) {
    const book = this.data.books.find(b => b.id === e.currentTarget.dataset.id);
    if (book) {
      this.setData({
        showDeleteModal: true,
        deleteBookId: book.id,
        deleteBookTitle: book.title
      });
    }
  },

  // 关闭删除弹窗
  closeDeleteModal() {
    this.setData({
      showDeleteModal: false,
      deleteBookId: null,
      deleteBookTitle: ''
    });
  },

  // 确认删除
  confirmDelete() {
    if (this.data.deleteBookId) {
      app.removeBook(this.data.deleteBookId);

      // 删除本地文件
      const book = this.data.books.find(b => b.id === this.data.deleteBookId);
      if (book && book.localPath) {
        wx.removeSavedFile({
          filePath: book.localPath,
          fail: (err) => {
            console.error('删除文件失败', err);
          }
        });
      }

      this.closeDeleteModal();
      this.loadBooks();

      wx.showToast({
        title: '删除成功',
        icon: 'success'
      });
    }
  },

  // 跳转到上传页面
  goToUpload() {
    wx.switchTab({
      url: '/pages/upload/upload'
    });
  },

  // 搜索
  onSearch() {
    wx.showToast({
      title: '搜索功能开发中',
      icon: 'none'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '我的电子书架',
      path: '/pages/index/index'
    };
  }
});
