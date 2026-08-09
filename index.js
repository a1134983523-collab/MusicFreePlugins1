const axios = require('axios');

const API = 'https://www.cyanyun.com/api';
const PLATFORM = '网易云音乐';

function clean(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u3000\s]/g, '')
    .replace(/[《》「」『』【】（）()［］[\]{}<>]/g, '')
    .replace(/[·•・,，.。!！?？:：;；/\\|_-]/g, '');
}

function artistName(song) {
  if (Array.isArray(song.ar)) {
    return song.ar
      .map(function (x) {
        return x && x.name ? x.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  if (Array.isArray(song.artists)) {
    return song.artists
      .map(function (x) {
        return x && x.name ? x.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  return '';
}

function albumName(song) {
  if (song.al && song.al.name) {
    return song.al.name;
  }

  if (song.album && song.album.name) {
    return song.album.name;
  }

  return '';
}

function artwork(song) {
  if (song.al && song.al.picUrl) {
    return song.al.picUrl;
  }

  if (song.album && song.album.picUrl) {
    return song.album.picUrl;
  }

  return '';
}

/*
 * 保留网易云原始 ID。
 *
 * 这是非常重要的：
 *
 * MusicFree:
 * platform + id
 *
 * 就是歌曲的唯一标识。
 */
function convertSong(song) {
  if (!song || song.id == null) {
    return null;
  }

  var item = {
    id: String(song.id),

    platform: PLATFORM,

    title: song.name || '',

    artist: artistName(song),

    album: albumName(song),

    artwork: artwork(song),

    duration: song.dt
      ? Math.floor(song.dt / 1000)
      : undefined
  };

  /*
   * 如果搜索结果本身带有播放地址，
   * 直接保存。
   */
  if (
    song.url &&
    typeof song.url === 'string'
  ) {
    item.url = song.url;
  }

  /*
   * 兼容部分接口可能返回：
   *
   * privilege
   * fee
   */
  if (song.privilege) {
    item.fee =
      song.privilege.fee;
  }

  if (song.fee != null) {
    item.fee = song.fee;
  }

  return item;
}

/*
 * 搜索相关度。
 */
function score(song, query) {
  var q = clean(query);

  var title = clean(song.title);
  var artist = clean(song.artist);
  var album = clean(song.album);

  var score = 0;

  if (!q) {
    return 0;
  }

  /*
   * 歌名完全相同。
   */
  if (title === q) {
    score += 10000;
  }

  /*
   * 歌名包含。
   */
  else if (title.indexOf(q) >= 0) {
    score += 7000;
  }

  /*
   * 歌手完全相同。
   */
  if (artist === q) {
    score += 5000;
  }

  /*
   * 歌手包含。
   */
  else if (artist.indexOf(q) >= 0) {
    score += 3000;
  }

  /*
   * 专辑。
   */
  if (album === q) {
    score += 2000;
  }

  else if (album.indexOf(q) >= 0) {
    score += 500;
  }

  /*
   * 多关键词。
   *
   * 例如：
   *
   * 周杰伦 七里香
   */
  var words =
    String(query)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (words.length > 1) {
    var matched = 0;

    words.forEach(function (word) {
      var w = clean(word);

      if (title.indexOf(w) >= 0) {
        score += 2500;
        matched++;
      }

      else if (artist.indexOf(w) >= 0) {
        score += 2200;
        matched++;
      }

      else if (album.indexOf(w) >= 0) {
        score += 500;
        matched++;
      }
    });

    if (matched === words.length) {
      score += 6000;
    }
  }

  /*
   * Live / DJ / Remix / 伴奏等版本降权。
   */
  var special =
    'live 现场 演唱会 remix 混音 dj demo 伴奏 instrumental 纯音乐 翻唱 cover';

  special.split(' ').forEach(function (word) {
    if (
      (
        String(song.title) +
        ' ' +
        String(song.album)
      )
        .toLowerCase()
        .indexOf(word) >= 0
    ) {
      score -= 1000;
    }
  });

  /*
   * 已经有播放地址的结果稍微优先。
   */
  if (song.url) {
    score += 300;
  }

  return score;
}

function deduplicate(list) {
  var map = {};
  var result = [];

  list.forEach(function (song) {
    /*
     * 第一优先使用网易云 ID。
     */
    var key = song.id;

    /*
     * 没有 ID 才使用歌名 + 歌手。
     */
    if (!key) {
      key =
        clean(song.title) +
        '|' +
        clean(song.artist);
    }

    if (!key || map[key]) {
      return;
    }

    map[key] = true;
    result.push(song);
  });

  return result;
}

function rank(list, query) {
  return list
    .map(function (song, index) {
      return {
        song: song,
        score: score(song, query),
        index: index
      };
    })
    .sort(function (a, b) {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.index - b.index;
    })
    .map(function (x) {
      return x.song;
    });
}

function empty() {
  return {
    isEnd: true,
    data: []
  };
}

module.exports = {

  platform: PLATFORM,

  version: '8.0.0',

  author: 'a1134983523-collab',

  description:
    '网易云音乐精准搜索及公开播放源',

  srcUrl:
    'https://raw.githubusercontent.com/a1134983523-collab/MusicFreePlugins1/main/index.js',

  /*
   * 搜索
   */
  async search(query, page, type) {

    if (!query) {
      return empty();
    }

    page = page || 1;

    /*
     * 只处理歌曲搜索。
     */
    if (
      type &&
      type !== 'music'
    ) {
      return empty();
    }

    try {

      var response =
        await axios.get(
          API + '/search',
          {
            params: {
              keywords: query,

              limit: 50,

              offset:
                (page - 1) * 50,

              type: 1
            },

            timeout: 20000
          }
        );

      var result =
        response.data;

      if (
        !result ||
        !result.result ||
        !Array.isArray(
          result.result.songs
        )
      ) {
        return empty();
      }

      var songs =
        result.result.songs
          .map(convertSong)
          .filter(Boolean);

      /*
       * 去重。
       */
      songs =
        deduplicate(songs);

      /*
       * 排序。
       */
      songs =
        rank(
          songs,
          query
        );

      /*
       * 最多返回 30 首。
       */
      songs =
        songs.slice(0, 30);

      return {
        isEnd:
          songs.length < 30,

        data: songs
      };

    } catch (error) {

      console.log(
        '[网易云搜索失败]',
        error &&
        error.message
          ? error.message
          : error
      );

      return empty();
    }
  },

  /*
   * 获取播放地址。
   *
   * 关键：
   *
   * 1. 如果搜索结果已经有 URL，
   *    直接使用。
   *
   * 2. 没有 URL，
   *    再请求网易云播放地址接口。
   */
  async getMediaSource(
    musicItem
  ) {

    if (!musicItem) {
      return null;
    }

    /*
     * 第一优先：
     * 搜索结果自带 URL。
     */
    if (
      musicItem.url &&
      typeof musicItem.url === 'string'
    ) {

      return {
        url: musicItem.url
      };
    }

    /*
     * 第二优先：
     * 使用原始网易云 ID。
     */
    var id =
      musicItem.id;

    if (!id) {
      return null;
    }

    /*
     * 新版接口。
     */
    try {

      var response =
        await axios.get(
          API + '/song/url/v1',
          {
            params: {
              id: id,

              level: 'standard'
            },

            timeout: 20000
          }
        );

      var result =
        response.data;

      if (
        result &&
        Array.isArray(result.data)
      ) {

        var item =
          result.data.find(
            function (x) {
              return (
                x &&
                x.url
              );
            }
          );

        if (
          item &&
          item.url
        ) {

          return {
            url: item.url
          };
        }
      }

    } catch (error) {

      console.log(
        '[网易云 v1 播放失败]',
        error &&
        error.message
          ? error.message
          : error
      );
    }

    /*
     * 兼容旧接口。
     */
    try {

      var oldResponse =
        await axios.get(
          API + '/song/url',
          {
            params: {
              id: id
            },

            timeout: 20000
          }
        );

      var oldResult =
        oldResponse.data;

      if (
        oldResult &&
        Array.isArray(
          oldResult.data
        )
      ) {

        var oldItem =
          oldResult.data.find(
            function (x) {
              return (
                x &&
                x.url
              );
            }
          );

        if (
          oldItem &&
          oldItem.url
        ) {

          return {
            url:
              oldItem.url
          };
        }
      }

      if (
        oldResult &&
        oldResult.url
      ) {

        return {
          url:
            oldResult.url
        };
      }

    } catch (error) {

      console.log(
        '[网易云旧播放接口失败]',
        error &&
        error.message
          ? error.message
          : error
      );
    }

    /*
     * 没有公开播放地址。
     */
    return null;
  },

  /*
   * 歌词。
   */
  async getLyric(
    musicItem
  ) {

    if (!musicItem) {
      return null;
    }

    var id =
      musicItem.id;

    if (!id) {
      return null;
    }

    try {

      var response =
        await axios.get(
          API + '/song/lyric',
          {
            params: {
              id: id
            },

            timeout: 20000
          }
        );

      var result =
        response.data;

      if (
        !result ||
        !result.lrc ||
        !result.lrc.lyric
      ) {
        return null;
      }

      return {
        rawLrc:
          result.lrc.lyric,

        translation:
          result.tlyric &&
          result.tlyric.lyric
            ? result.tlyric.lyric
            : undefined
      };

    } catch (error) {

      console.log(
        '[网易云歌词失败]',
        error &&
        error.message
          ? error.message
          : error
      );

      return null;
    }
  }
};