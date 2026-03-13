// utils/util.js

/**
 * 格式化时间
 */
function formatTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(timestamp) {
  if (!timestamp) return '未知';

  const now = Date.now();
  const diff = now - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return Math.floor(diff / minute) + '分钟前';
  } else if (diff < day) {
    return Math.floor(diff / hour) + '小时前';
  } else if (diff < week) {
    return Math.floor(diff / day) + '天前';
  } else if (diff < month) {
    return Math.floor(diff / week) + '周前';
  } else if (diff < year) {
    return Math.floor(diff / month) + '月前';
  } else {
    return Math.floor(diff / year) + '年前';
  }
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * 生成唯一ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 防抖函数
 */
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 */
function throttle(fn, delay) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 深度克隆对象
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const clonedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      clonedObj[key] = deepClone(obj[key]);
    }
  }
  return clonedObj;
}

/**
 * 检查是否为支持的文件格式
 */
function isSupportedFormat(fileName) {
  const supportedFormats = ['epub', 'pdf', 'txt', 'mobi', 'azw', 'azw3'];
  const ext = fileName.split('.').pop().toLowerCase();
  return supportedFormats.includes(ext);
}

/**
 * 获取文件扩展名
 */
function getFileExtension(fileName) {
  return fileName.split('.').pop().toLowerCase();
}

/**
 * 从文件名提取书名
 */
function extractTitle(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

/**
 * 计算阅读进度
 */
function calculateProgress(current, total) {
  if (!total || total === 0) return 0;
  return Math.min(100, Math.round((current / total) * 100));
}

/**
 * 文本分页
 */
function paginateText(text, wordsPerPage = 500) {
  if (!text) return [];

  const words = text.split('');
  const pages = [];
  let currentPage = '';

  for (let i = 0; i < words.length; i++) {
    currentPage += words[i];

    if (currentPage.length >= wordsPerPage && words[i] === '\n') {
      pages.push(currentPage);
      currentPage = '';
    }
  }

  if (currentPage) {
    pages.push(currentPage);
  }

  return pages;
}

/**
 * 滚动到元素
 */
function scrollToElement(selector, offset = 0) {
  const query = wx.createSelectorQuery();
  query.select(selector).boundingClientRect();
  query.selectViewport().scrollOffset();
  query.exec((res) => {
    if (res && res[0]) {
      wx.pageScrollTo({
        scrollTop: res[0].top + res[1].scrollTop - offset,
        duration: 300
      });
    }
  });
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示成功提示
 */
function showSuccess(title, duration = 1500) {
  wx.showToast({
    title,
    icon: 'success',
    duration
  });
}

/**
 * 显示错误提示
 */
function showError(title, duration = 1500) {
  wx.showToast({
    title,
    icon: 'none',
    duration
  });
}

/**
 * 显示确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
}

module.exports = {
  formatTime,
  formatRelativeTime,
  formatFileSize,
  generateId,
  debounce,
  throttle,
  deepClone,
  isSupportedFormat,
  getFileExtension,
  extractTitle,
  calculateProgress,
  paginateText,
  scrollToElement,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm
};
