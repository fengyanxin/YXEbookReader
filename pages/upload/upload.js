// pages/upload/upload.js
const app = getApp()
const epubParser = require('../../utils/epubParser')
const pdfParser = require('../../utils/pdfParser')

Page({
  data: {
    isDragging: false,
    uploading: false,
    uploadProgress: 0,
    recentBooks: [],
    showEditModal: false,
    editingBook: {
      title: '',
      author: '',
      description: '',
      cover: ''
    },
    tempFilePath: '',
    tempFileInfo: null,
    statusBarHeight: 44
  },

  onLoad() {
    // 获取状态栏高度
    this.setData({
      statusBarHeight: app.getStatusBarHeightInRpx()
    });

    this.loadRecentBooks();
  },

  onShow() {
    this.loadRecentBooks();
  },

  // 加载最近上传的书籍
  loadRecentBooks() {
    const books = app.globalData.books || [];
    const recentBooks = books.slice(-5).reverse();
    this.setData({ recentBooks });
  },

  // 选择文件
  chooseFile() {
    wx.showActionSheet({
      itemList: ['从聊天中选择', '从文件中选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.chooseMessageFile();
        } else if (res.tapIndex === 1) {
          this.chooseNormalFile();
        }
      }
    });
  },

  // 从聊天中选择文件
  chooseMessageFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['epub', 'pdf', 'txt', 'mobi', 'azw'],
      success: (res) => {
        const file = res.tempFiles[0];
        this.handleFileSelect(file);
      },
      fail: (err) => {
        console.error('选择文件失败', err);
      }
    });
  },

  // 从普通文件中选择
  chooseNormalFile() {
    // 小程序不支持直接选择系统文件
    // 可以引导用户使用"从聊天中选择"功能
    wx.showModal({
      title: '提示',
      content: '请先将文件发送到微信聊天中，然后从聊天中选择文件导入',
      showCancel: false
    });
  },

  // 处理文件选择
  handleFileSelect(file) {
    const { name, path, size } = file;

    // 检查文件大小 (50MB限制)
    if (size > 50 * 1024 * 1024) {
      wx.showToast({
        title: '文件过大，最大支持50MB',
        icon: 'none'
      });
      return;
    }

    // 获取文件扩展名
    const ext = name.split('.').pop().toLowerCase();
    const supportedFormats = ['epub', 'pdf', 'txt', 'mobi', 'azw'];

    if (!supportedFormats.includes(ext)) {
      wx.showToast({
        title: '不支持的文件格式',
        icon: 'none'
      });
      return;
    }

    // 保存临时文件信息
    this.setData({
      tempFilePath: path,
      tempFileInfo: {
        name,
        size,
        format: ext.toUpperCase()
      }
    });

    // 开始上传处理
    this.processFile(file);
  },

  // 处理文件
  processFile(file) {
    wx.showLoading({
      title: '正在处理...',
      mask: true
    });

    // 读取文件内容
    this.readFileContent(file.path, file.name);
  },

  // 读取文件内容
  readFileContent(filePath, fileName) {
    const fs = wx.getFileSystemManager();
    const ext = fileName.split('.').pop().toLowerCase();

    try {
      if (ext === 'txt') {
        // TXT文件直接读取
        fs.readFile({
          filePath: filePath,
          encoding: 'utf-8',
          success: (res) => {
            this.createBook(res.data, fileName, 'TXT', null);
          },
          fail: (err) => {
            // 尝试其他编码
            fs.readFile({
              filePath: filePath,
              encoding: 'binary',
              success: (res) => {
                this.createBook(res.data, fileName, 'TXT', null);
              },
              fail: () => {
                wx.hideLoading();
                wx.showToast({
                  title: 'TXT文件读取失败',
                  icon: 'none'
                });
              }
            });
          }
        });
      } else if (ext === 'epub') {
        // 使用 EPUB 解析器
        this.parseEPUBFile(filePath, fileName);
      } else if (ext === 'pdf') {
        // 使用 PDF 解析器
        this.parsePDFFile(filePath, fileName);
      } else if (ext === 'mobi' || ext === 'azw') {
        // MOBI/AZW 文件
        this.createBook('', fileName, ext.toUpperCase(), null);
        wx.showToast({
          title: `${ext.toUpperCase()}格式暂不支持完整解析`,
          icon: 'none',
          duration: 2000
        });
      } else {
        // 其他格式
        this.createBook('', fileName, ext.toUpperCase(), null);
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({
        title: '文件读取失败',
        icon: 'none'
      });
    }
  },

  // 解析 EPUB 文件
  parseEPUBFile(filePath, fileName) {
    epubParser.parseEPUB(filePath, fileName)
      .then(result => {
        wx.hideLoading();

        // 创建书籍对象
        const book = this.createBookFromParseResult(result, fileName, 'EPUB');
        book.localPath = this.data.tempFilePath;
        book.fileSize = this.data.tempFileInfo?.size || 0;

        // 显示编辑弹窗
        this.setData({
          showEditModal: true,
          editingBook: book
        });

        // 如果解析成功，显示提示
        var hasContent = result.content && result.content.length > 0;
        var hasChapters = result.chapters && result.chapters.length > 0;

        if (hasContent || hasChapters) {
          wx.showToast({
            title: hasChapters ? 'EPUB解析成功，共 ' + result.chapters.length + ' 章' : 'EPUB解析成功',
            icon: 'success',
            duration: 1500
          });
        } else if (result.error) {
          wx.showToast({
            title: 'EPUB解析部分失败',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('EPUB解析失败:', err);

        // 降级处理
        const book = this.createBook(fileName, '', 'EPUB', null);
        book.localPath = this.data.tempFilePath;
        book.fileSize = this.data.tempFileInfo?.size || 0;
        book.content = 'EPUB 文件解析失败：' + (err.message || '未知错误');

        this.setData({
          showEditModal: true,
          editingBook: book
        });

        wx.showToast({
          title: 'EPUB解析失败，已创建基础记录',
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 解析 PDF 文件
  parsePDFFile(filePath, fileName) {
    pdfParser.parsePDF(filePath, fileName)
      .then(result => {
        wx.hideLoading();

        // 创建书籍对象
        const book = this.createBookFromParseResult(result, fileName, 'PDF');
        book.localPath = this.data.tempFilePath;
        book.fileSize = this.data.tempFileInfo?.size || 0;

        // 显示编辑弹窗
        this.setData({
          showEditModal: true,
          editingBook: book
        });

        // 如果解析成功，显示提示
        if (result.content && result.content.length > 100) {
          wx.showToast({
            title: 'PDF文本提取成功',
            icon: 'success',
            duration: 1500
          });
        } else {
          wx.showToast({
            title: 'PDF为图片型或加密',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('PDF解析失败:', err);

        // 降级处理
        const book = this.createBook(fileName, '', 'PDF', null);
        book.localPath = this.data.tempFilePath;
        book.fileSize = this.data.tempFileInfo?.size || 0;
        book.content = 'PDF 文件解析失败：' + (err.message || '未知错误');

        this.setData({
          showEditModal: true,
          editingBook: book
        });

        wx.showToast({
          title: 'PDF解析失败',
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 从解析结果创建书籍对象
  createBookFromParseResult(result, fileName, format) {
    // 生成书籍ID
    const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 使用解析结果或默认值
    const title = result.title || fileName.replace(/\.[^/.]+$/, '');
    const author = result.author || '未知作者';
    const description = result.description || '';

    // 创建书籍对象
    const book = {
      id: bookId,
      title: title,
      author: author,
      description: description,
      cover: this.generateDefaultCover(title),
      format: format,
      content: result.content || '',
      addTime: Date.now(),
      lastReadTime: 0,
      progress: 0,
      totalPages: result.totalPages || this.calculateTotalPages(result.content || ''),
      currentPage: 0,
      chapters: result.chapters || [],
      totalChapters: result.totalChapters || 0
    };

    return book;
  },

  // 创建书籍对象（原始方法，保持兼容）
  createBook(content, fileName, format, coverImage) {
    // 生成默认书名和作者
    const title = fileName.replace(/\.[^/.]+$/, '');
    const author = '未知作者';

    // 生成书籍ID
    const bookId = 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // 创建书籍对象
    const book = {
      id: bookId,
      title: title,
      author: author,
      description: '',
      cover: coverImage || this.generateDefaultCover(title),
      format: format,
      content: content,
      localPath: this.data.tempFilePath,
      fileSize: this.data.tempFileInfo?.size || 0,
      addTime: Date.now(),
      lastReadTime: 0,
      progress: 0,
      totalPages: this.calculateTotalPages(content),
      currentPage: 0
    };

    wx.hideLoading();

    return book;
  },

  // 生成默认封面
  generateDefaultCover(title) {
    // 使用渐变色作为默认封面
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
      'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
      'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)'
    ];
    const colorIndex = Math.floor(Math.random() * colors.length);
    return colors[colorIndex];
  },

  // 计算总页数（简化版）
  calculateTotalPages(content) {
    if (!content) return 100;
    const wordsPerPage = 500;
    return Math.ceil(content.length / wordsPerPage);
  },

  // 书名输入
  onTitleInput(e) {
    this.setData({
      'editingBook.title': e.detail.value
    });
  },

  // 作者输入
  onAuthorInput(e) {
    this.setData({
      'editingBook.author': e.detail.value
    });
  },

  // 简介输入
  onDescInput(e) {
    this.setData({
      'editingBook.description': e.detail.value
    });
  },

  // 更换封面
  changeCover() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          'editingBook.cover': res.tempFilePaths[0]
        });
      }
    });
  },

  // 保存书籍信息
  saveBookInfo() {
    const book = this.data.editingBook;

    if (!book.title) {
      wx.showToast({
        title: '请输入书名',
        icon: 'none'
      });
      return;
    }

    // 添加到全局数据
    app.addBook(book);

    // 保存文件到本地
    this.saveFileToLocal(book);

    this.closeEditModal();

    // 刷新最近上传列表
    this.loadRecentBooks();

    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 保存文件到本地
  saveFileToLocal(book) {
    if (!book.localPath) return;

    wx.saveFile({
      tempFilePath: book.localPath,
      success: (res) => {
        book.localPath = res.savedFilePath;
        book.savedFilePath = res.savedFilePath;
        app.saveToStorage();
      },
      fail: (err) => {
        console.error('保存文件失败', err);
      }
    });
  },

  // 关闭编辑弹窗
  closeEditModal() {
    this.setData({
      showEditModal: false,
      editingBook: {
        title: '',
        author: '',
        description: '',
        cover: ''
      },
      tempFilePath: '',
      tempFileInfo: null
    });
  },

  // 打开书籍
  openBook(e) {
    const book = e.currentTarget.dataset.book;
    app.globalData.currentBook = book;

    wx.navigateTo({
      url: `/pages/reader/reader?id=${book.id}`
    });
  },

  // 查看所有书籍
  viewAllBooks() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '电子书阅读器 - 上传书籍',
      path: '/pages/upload/upload'
    };
  }
});
