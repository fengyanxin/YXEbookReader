// pages/reader/reader.js
const app = getApp()

Page({
  data: {
    book: {},
    bookId: '',
    contentLines: [],
    epubContentLines: [],
    pdfContentLines: [],
    currentPage: 0,
    totalPages: 0,
    currentChapterIndex: 0,
    chapterContent: [],
    chapterScrollTop: 0,
    chapterProgress: 0,
    readProgress: 0,
    showControls: false,
    showSettings: false,
    showChapterList: false,
    showProgress: false,
    isBookmarked: false,
    statusBarHeight: 44,

    // 阅读设置
    fontSize: 36,
    fontFamily: 'system',
    lineHeight: 1.8,
    theme: 'light',
    backgroundType: 'solid',
    backgroundColor: '#ffffff',
    textColor: '#2c3e50',
    pageEffect: 'slide',

    // 滚动相关
    scrollToView: '',
    scrollPositions: {}
  },

  onLoad(options) {
    // 获取状态栏高度
    this.setData({
      statusBarHeight: app.getStatusBarHeightInRpx()
    });

    const bookId = options.id;
    const type = options.type;

    if (type === 'pdf') {
      // PDF 阅读模式
      this.loadPdfBook(bookId);
    } else {
      // 普通阅读模式
      this.loadBook(bookId);
    }

    // 加载阅读设置
    this.loadSettings();

    // 监听屏幕旋转
    this.onScreenOrientationChange();
  },

  onReady() {
    // 设置导航栏
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#2c3e50'
    });
  },

  onUnload() {
    // 保存阅读进度
    this.saveReadingProgress();
  },

  onHide() {
    // 保存阅读进度
    this.saveReadingProgress();
  },

  // 加载书籍
  loadBook(bookId) {
    const book = app.getBook(bookId);

    if (!book) {
      wx.showToast({
        title: '书籍不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    // 计算总章节数
    const totalChapters = book.chapters ? book.chapters.length : 0;

    // 恢复保存的阅读进度
    const savedChapterIndex = book.currentChapterIndex || 0;
    const savedScrollTop = book.chapterScrollTop || 0;

    this.setData({
      book,
      bookId,
      currentChapterIndex: savedChapterIndex,
      chapterScrollTop: savedScrollTop,
      totalPages: totalChapters || book.totalPages || 100,
      readProgress: book.progress || 0,
      fileSizeText: this.formatFileSize(book.fileSize),
      addTimeText: this.formatAddTime(book.addTime)
    });

    // 处理书籍内容
    this.processBookContent(book);

    // 加载保存的章节
    if (book.chapters && book.chapters.length > 0) {
      this.loadChapter(savedChapterIndex, false);
    }
  },

  // 加载PDF书籍
  loadPdfBook(bookId) {
    const book = app.getBook(bookId);

    if (!book) {
      wx.showToast({
        title: '书籍不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({
      book,
      bookId,
      currentPage: 0,
      readProgress: 0,
      fileSizeText: this.formatFileSize(book.fileSize),
      addTimeText: this.formatAddTime(book.addTime)
    });
  },

  // 处理书籍内容
  processBookContent(book) {
    let contentLines = [];

    if (book.format === 'TXT' && book.content) {
      // TXT 分行处理
      contentLines = book.content.split('\n').filter(line => line.trim());

      // 计算总页数
      const totalPages = Math.ceil(contentLines.length / 20);

      this.setData({
        contentLines,
        totalPages
      });
    } else if (book.format === 'EPUB') {
      // EPUB 内容处理 - 使用章节
      if (book.chapters && book.chapters.length > 0) {
        // EPUB 有章节数据，直接使用
        this.setData({
          totalPages: book.chapters.length
        });
      } else if (book.content) {
        // 降级：如果只有单一内容，智能分段
        const epubLines = this.smartSplitContent(book.content);
        const totalPages = Math.ceil(epubLines.length / 20);

        this.setData({
          epubContentLines: epubLines,
          totalPages: totalPages || book.totalPages || 100
        });
      } else {
        this.setData({
          totalPages: book.totalPages || 100
        });
      }
    } else if (book.format === 'PDF') {
      // PDF 内容处理
      if (book.content && book.content.length > 200) {
        // 智能分段
        const pdfLines = this.smartSplitContent(book.content);
        const totalPages = Math.ceil(pdfLines.length / 20);

        this.setData({
          pdfContentLines: pdfLines,
          totalPages: totalPages || book.totalPages || 100
        });
      } else {
        this.setData({
          totalPages: book.totalPages || 100
        });
      }
    }
  },

  // 加载章节
  loadChapter(chapterIndex, restoreScroll) {
    restoreScroll = restoreScroll !== false;

    const book = this.data.book;
    if (!book || !book.chapters || !book.chapters[chapterIndex]) {
      return;
    }

    const chapter = book.chapters[chapterIndex];
    const content = chapter.content || '';

    // 如果内容为空，显示提示
    if (!content || content.length === 0) {
      this.setData({
        currentChapterIndex: chapterIndex,
        chapterContent: ['此章节暂无内容'],
        scrollToView: ''
      });
      return;
    }

    // 智能分段
    const chapterLines = this.smartSplitContent(content);

    this.setData({
      currentChapterIndex: chapterIndex,
      chapterContent: chapterLines,
      scrollToView: ''
    });

    // 恢复滚动位置
    const savedScrollTop = this.data.chapterScrollTop || 0;
    const chapterPositions = this.data.scrollPositions || {};
    const chapterKey = 'chapter_' + chapterIndex;
    const savedScrollPosition = chapterPositions[chapterKey] || 0;

    if (restoreScroll && (savedScrollTop > 0 || savedScrollPosition > 0)) {
      // 使用保存的滚动位置
      const targetScrollTop = savedScrollPosition || savedScrollTop;

      // 使用 setTimeout 确保渲染完成后滚动
      setTimeout(() => {
        this.setData({ scrollToView: 'chapter_start' });
        setTimeout(() => {
          const query = wx.createSelectorQuery();
          query.select('.text-content').boundingClientRect(rect => {
            if (rect && rect.length > 0) {
              // 计算滚动位置
              const scrollTop = Math.min(targetScrollTop, rect[0].height);
              this.setData({
                scrollToView: '',
                chapterScrollTop: scrollTop
              });
              // 延迟滚动确保页面已渲染
              setTimeout(() => {
                wx.pageScrollTo({
                  scrollTop: scrollTop,
                  duration: 300
                });
              }, 100);
            }
          }).exec();
        }, 100);
      }, 50);
    } else {
      // 如果没有保存的位置，重置滚动
      this.setData({
        chapterScrollTop: 0
      });
    }

    // 计算并更新进度
    this.calculateProgress();
  },

  // 计算阅读进度
  calculateProgress() {
    const book = this.data.book;
    if (!book) return;

    let progress = 0;

    if (book.format === 'EPUB' && book.chapters && book.chapters.length > 0) {
      // EPUB：章节进度 + 章节内滚动进度
      const chapterProgress = (this.data.currentChapterIndex + 1) / book.chapters.length;

      // 获取章节内容高度来计算滚动进度
      const query = wx.createSelectorQuery();
      query.select('.text-content').boundingClientRect(rect => {
        if (rect && rect.length > 0) {
          const totalHeight = rect[0].height;
          // 计算滚动位置进度（0-1）
          let normalizedScroll = this.data.chapterProgress || 0;
          if (totalHeight > 0) {
            normalizedScroll = Math.min(normalizedScroll / totalHeight, 1);
          }
          // 章节占 70% 权重，滚动占 30% 权重
          progress = Math.round((chapterProgress * 100 * 0.7) + (normalizedScroll * 100 * 0.3));
          // 更新章节内进度
          this.setData({ chapterProgress: normalizedScroll });
        } else {
          progress = Math.round(chapterProgress * 100);
        }

        this.setData({ readProgress: progress });
        return progress;
      }).exec();

      return progress;

    } else if (book.format === 'TXT' || book.format === 'PDF') {
      // TXT/PDF：基于滚动位置
      const scrollProgress = this.data.chapterProgress || 0;
      progress = Math.round(scrollProgress * 100);
      this.setData({ readProgress: progress });
      return progress;

    } else {
      progress = book.progress || 0;
      this.setData({ readProgress: progress });
      return progress;
    }
  },

  // 智能分段（按段落或句子）
  smartSplitContent(content) {
    if (!content) return [];

    var lines = [];

    // 首先按段落分割
    var paragraphs = content.split(/\n\n+/);

    for (var i = 0; i < paragraphs.length; i++) {
      var para = paragraphs[i];
      var trimmed = para.trim();
      if (!trimmed) continue;

      // 如果段落太长，按句子分割
      if (trimmed.length > 200) {
        var sentences = trimmed.split(/([。！？；.!?;])/);
        var currentSentence = '';

        for (var j = 0; j < sentences.length; j++) {
          var part = sentences[j];
          currentSentence += part;

          // 如果是句子结束符号，或者是最后一部分
          if (part.match(/[。！？；.!?;]/) || j === sentences.length - 1) {
            if (currentSentence.trim()) {
              lines.push(currentSentence.trim());
            }
            currentSentence = '';
          }

          // 防止单个句子过长
          if (currentSentence.length > 100 && currentSentence.trim()) {
            lines.push(currentSentence.trim());
            currentSentence = '';
          }
        }
      } else {
        lines.push(trimmed);
      }
    }

    return lines;
  },

  // 获取主题颜色
  getThemeColor(theme) {
    const colors = {
      light: '#ffffff',
      sepia: '#f4ecd8',
      dark: '#1a1a1a',
      green: '#c7edcc'
    };
    return colors[theme] || colors.light;
  },

  // 获取文字颜色
  getTextColor(theme) {
    const colors = {
      light: '#2c3e50',
      sepia: '#5c4b37',
      dark: '#c0c0c0',
      green: '#2c5c2f'
    };
    return colors[theme] || colors.light;
  },

  // 滚动到章节内的指定进度位置
  scrollToChapterProgress(progress) {
    const query = wx.createSelectorQuery();
    query.select('.text-content').boundingClientRect(rect => {
      if (rect && rect.length > 0) {
        const totalHeight = rect[0].height;
        const targetScrollTop = Math.min(progress * totalHeight, totalHeight);

        this.setData({
          chapterScrollTop: targetScrollTop
        });

        wx.pageScrollTo({
          scrollTop: targetScrollTop,
          duration: 300
        });
      }
    }).exec();
  },

  // 格式化文件大小
  formatFileSize(bytes) {
    if (!bytes) return '未知';

    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  },

  // 格式化添加时间
  formatAddTime(timestamp) {
    if (!timestamp) return '未知';

    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  },

  // 滚动事件
  onScroll(e) {
    const { scrollTop, scrollHeight } = e.detail;
    const book = this.data.book;

    // 保存当前章节的滚动位置
    this.setData({
      chapterScrollTop: scrollTop
    });

    // 保存滚动位置到缓存（使用章节索引作为 key）
    const chapterPositions = this.data.scrollPositions || {};
    chapterPositions['chapter_' + this.data.currentChapterIndex] = scrollTop;
    this.setData({ scrollPositions: chapterPositions });

    // 计算 EPUB 章节内的进度
    if (book && book.format === 'EPUB' && book.chapters && book.chapters.length > 0) {
      const query = wx.createSelectorQuery();
      query.select('.text-content').boundingClientRect(rect => {
        if (rect && rect.length > 0) {
          const totalHeight = rect[0].height;
          if (totalHeight > 0) {
            const scrollProgress = Math.min(scrollTop / totalHeight, 1);
            this.setData({ chapterProgress: scrollProgress });
          }
        }
      }).exec();
    }

    // 计算阅读进度
    this.calculateProgress();

    // 显示进度指示器
    this.setData({ showProgress: true });

    // 隐藏进度指示器
    clearTimeout(this.progressTimer);
    this.progressTimer = setTimeout(() => {
      this.setData({ showProgress: false });
    }, 2000);
  },

  // 切换控制栏显示
  toggleControls() {
    this.setData({
      showControls: !this.data.showControls
    });
  },

  // 返回
  goBack() {
    this.saveReadingProgress();
    wx.navigateBack();
  },

  // 切换书签
  toggleBookmark() {
    this.setData({
      isBookmarked: !this.data.isBookmarked
    });

    wx.showToast({
      title: this.data.isBookmarked ? '已添加书签' : '已移除书签',
      icon: 'none'
    });
  },

  // 上一页
  prevPage() {
    this.pageTurn(-1);
  },

  // 下一页
  nextPage() {
    this.pageTurn(1);
  },

  // 翻页
  pageTurn(direction) {
    const effect = this.data.pageEffect;

    if (effect === 'slide') {
      // 滑动效果
      this.animateSlide(direction);
    } else if (effect === 'fade') {
      // 淡入淡出效果
      this.animateFade();
    } else {
      // 无效果，直接翻页
      this.changePage(direction);
    }
  },

  // 滑动动画
  animateSlide(direction) {
    const offset = direction * 100;
    const content = this.selectComponent('.content-scroll');

    // 简化实现，直接翻页
    this.changePage(direction);
  },

  // 淡入淡出动画
  animateFade() {
    // 简化实现
    this.changePage(1);
  },

  // 改变页码
  changePage(direction) {
    const newPage = Math.max(0, Math.min(this.data.totalPages - 1, this.data.currentPage + direction));

    if (newPage !== this.data.currentPage) {
      this.setData({
        currentPage: newPage,
        scrollToView: `page_${newPage}`
      });

      // 更新进度
      const progress = Math.round((newPage / this.data.totalPages) * 100);
      this.setData({ readProgress: progress });
    }
  },

  // 上一章
  prevChapter() {
    const book = this.data.book;
    const currentIndex = this.data.currentChapterIndex;

    if (!book || !book.chapters || book.chapters.length === 0) {
      wx.showToast({
        title: '无章节',
        icon: 'none'
      });
      return;
    }

    if (currentIndex > 0) {
      this.loadChapter(currentIndex - 1);
    } else {
      wx.showToast({
        title: '已经是第一章了',
        icon: 'none'
      });
    }
  },

  // 下一章
  nextChapter() {
    const book = this.data.book;
    const currentIndex = this.data.currentChapterIndex;

    if (!book || !book.chapters || book.chapters.length === 0) {
      wx.showToast({
        title: '无章节',
        icon: 'none'
      });
      return;
    }

    if (currentIndex < book.chapters.length - 1) {
      this.loadChapter(currentIndex + 1);
    } else {
      wx.showToast({
        title: '已经是最后一章了',
        icon: 'none'
      });
    }
  },

  // 打开章节目录
  toggleChapterList() {
    this.setData({
      showChapterList: !this.data.showChapterList
    });
  },

  // 选择章节
  selectChapter(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    this.loadChapter(index);
    this.setData({
      showChapterList: false
    });
  },

  // 打开设置
  openSettings() {
    this.setData({
      showSettings: true
    });
  },

  // 关闭设置
  closeSettings() {
    this.setData({
      showSettings: false
    });

    // 保存设置
    this.saveSettings();
  },

  // 设置字体大小
  setFontSize(e) {
    const size = parseInt(e.currentTarget.dataset.size);
    this.setData({ fontSize: size });
    this.updateSettings({ fontSize: size });
  },

  // 字体大小滑块变化
  onFontSizeChange(e) {
    const size = e.detail.value;
    this.setData({ fontSize: size });
    this.updateSettings({ fontSize: size });
  },

  // 设置字体
  setFontFamily(e) {
    const font = e.currentTarget.dataset.font;
    this.setData({ fontFamily: font });
    this.updateSettings({ fontFamily: font });
  },

  // 行间距变化
  onLineHeightChange(e) {
    const height = parseFloat(e.detail.value);
    this.setData({ lineHeight: height });
    this.updateSettings({ lineHeight: height });
  },

  // 设置主题
  setTheme(e) {
    const theme = e.currentTarget.dataset.theme;
    const backgroundColor = this.getThemeColor(theme);
    const textColor = this.getTextColor(theme);

    this.setData({
      theme,
      backgroundColor,
      textColor
    });

    this.updateSettings({ theme });
  },

  // 设置背景
  setBackground(e) {
    const type = e.currentTarget.dataset.type;
    const bg = e.currentTarget.dataset.bg;
    const color = e.currentTarget.dataset.color;

    this.setData({
      backgroundType: type,
      backgroundColor: color
    });

    this.updateSettings({ backgroundType: type, backgroundColor: color });
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
          backgroundType: 'image',
          backgroundColor: ''
        });

        // 保存背景图片路径到设置
        this.updateSettings({
          backgroundType: 'image',
          backgroundImage: imagePath
        });
      }
    });
  },

  // 设置翻页效果
  setPageEffect(e) {
    const effect = e.currentTarget.dataset.effect;
    this.setData({ pageEffect: effect });
    this.updateSettings({ pageEffect: effect });
  },

  // 进度滑块变化
  onProgressChange(e) {
    const progress = e.detail.value;
    this.setData({ readProgress: progress });

    const book = this.data.book;
    if (!book) return;

    // 根据书籍类型跳转
    if (book.format === 'EPUB' && book.chapters && book.chapters.length > 0) {
      // EPUB：计算对应的章节和滚动位置
      const overallProgress = progress / 100; // 0-1 表示整体进度

      // 计算章节索引
      const chapterIndex = Math.min(Math.floor(overallProgress * book.chapters.length), book.chapters.length - 1);

      // 计算该章节内的滚动进度
      const chapterProgressStart = chapterIndex / book.chapters.length;
      const chapterProgressEnd = (chapterIndex + 1) / book.chapters.length;
      const chapterProgressRange = chapterProgressEnd - chapterProgressStart;

      let chapterScrollProgress = 0;
      if (chapterProgressRange > 0) {
        chapterScrollProgress = (progress / 100 - chapterProgressStart) / chapterProgressRange;
      }

      // 如果是新章节，加载该章节
      if (chapterIndex !== this.data.currentChapterIndex) {
        this.loadChapter(chapterIndex, true);
      } else {
        // 在当前章节内滚动
        this.scrollToChapterProgress(chapterScrollProgress);
      }

    } else if (book.format === 'TXT' || book.format === 'PDF') {
      // TXT/PDF：直接滚动到位置
      const page = Math.round((progress / 100) * this.data.totalPages);
      this.setData({
        currentPage: page,
        scrollToView: `page_${page}`
      });
    } else {
      // 其他类型：只保存进度
      this.calculateProgress();
    }
  },

  // 滚动到章节内的指定进度位置
  scrollToChapterProgress(progress) {
    const query = wx.createSelectorQuery();
    query.select('.text-content').boundingClientRect(rect => {
      if (rect && rect.length > 0) {
        const totalHeight = rect[0].height;
        const targetScrollTop = Math.min(progress * totalHeight, totalHeight);

        this.setData({
          chapterScrollTop: targetScrollTop
        });

        wx.pageScrollTo({
          scrollTop: targetScrollTop,
          duration: 300
        });
      }
    }).exec();
  },

  // 进度滑块拖动中
  onProgressChanging(e) {
    const progress = e.detail.value;
    this.setData({ readProgress: progress });
  },

  // 加载阅读设置
  loadSettings() {
    const settings = app.globalData.settings || {};
    this.setData({
      fontSize: settings.fontSize || 18,
      fontFamily: settings.fontFamily || 'system',
      lineHeight: settings.lineHeight || 1.8,
      theme: settings.theme || 'light',
      backgroundType: settings.backgroundType || 'solid',
      backgroundColor: settings.backgroundColor || '#ffffff',
      textColor: settings.textColor || '#333333',
      pageEffect: settings.pageEffect || 'slide'
    });
  },

  // 更新设置
  updateSettings(settings) {
    app.updateSettings(settings);
  },

  // 保存设置
  saveSettings() {
    app.updateSettings({
      fontSize: this.data.fontSize,
      fontFamily: this.data.fontFamily,
      lineHeight: this.data.lineHeight,
      theme: this.data.theme,
      backgroundType: this.data.backgroundType,
      backgroundColor: this.data.backgroundColor,
      pageEffect: this.data.pageEffect
    });
  },

  // 保存阅读进度
  saveReadingProgress() {
    if (!this.data.bookId) return;

    const book = app.getBook(this.data.bookId);
    if (!book) return;

    // 计算并保存章节内滚动进度
    let chapterProgress = 0;
    if (this.data.book.format === 'EPUB' && book.chapters && book.chapters.length > 0) {
      const query = wx.createSelectorQuery();
      query.select('.text-content').boundingClientRect(rect => {
        if (rect && rect.length > 0) {
          const totalHeight = rect[0].height;
          chapterProgress = Math.min(this.data.chapterScrollTop / totalHeight, 1);
        }

        // 保存阅读信息到书籍对象
        book.currentChapterIndex = this.data.currentChapterIndex || 0;
        book.chapterScrollTop = this.data.chapterScrollTop || 0;
        book.chapterProgress = chapterProgress;
        book.progress = this.data.readProgress || 0;
        book.lastReadTime = Date.now();

        // 更新到全局数据
        app.updateBookProgress(this.data.bookId, book.progress);
        app.saveToStorage();
      }).exec();
    } else {
      // 其他格式：只保存滚动进度
      book.chapterProgress = this.data.chapterProgress || 0;
      book.progress = this.data.readProgress || 0;
      book.lastReadTime = Date.now();

      app.updateBookProgress(this.data.bookId, book.progress);
      app.saveToStorage();
    }
  },

  // 屏幕旋转处理
  onScreenOrientationChange() {
    // 监听屏幕旋转
    wx.onWindowResize(() => {
      // 重新计算布局
    });
  },

  // 分享
  onShareAppMessage() {
    return {
      title: `正在阅读《${this.data.book.title}》`,
      path: `/pages/reader/reader?id=${this.data.bookId}`
    };
  }
});