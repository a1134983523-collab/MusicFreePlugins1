/**
 * MusicFree 0.6.2 测试插件
 * 用于验证“从网络安装插件”是否正常
 */

module.exports = {
  platform: '我的音乐测试源',

  version: '1.0.0',

  author: 'a1134983523-collab',

  description: 'MusicFree 0.6.2 插件安装测试',

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  async searchMusic(keyword, page) {
    return [];
  },

  async getMediaSource(musicItem) {
    return {
      url: '',
    };
  },
};