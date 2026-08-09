module.exports = {
  platform: '测试插件',
  version: '1.0.0',
  author: 'a1134983523-collab',

  async search(query, page) {
    return {
      isEnd: true,
      data: []
    };
  }
};
