const axios = require('axios');

const API = 'https://api.jimsdeng.eu.org';
const PLATFORM = '网易云音乐';

function cleanText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[《》「」『』【】（）()［］[\]{}<>]/g, ' ')
    .replace(/[\s_\-—–·•,，.。!！?？:：;；/\\|]/g, '')
    .trim();
}

function getArtists(song) {
  if (Array.isArray(song.ar)) {
    return song.ar
      .map(function (a) {
        return a && a.name ? a.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  if (Array.isArray(song.artists)) {
    return song.artists
      .map(function (a) {
        return a && a.name ? a.name : '';
      })
      .filter(Boolean)
      .join(' / ');
  }

  return '';
}

function getAlbum(song) {
  if (song.al && song.al.name) {
    return song.al.name;
  }

  if (song.album && song.album.name) {
    return song.album.name;
  }

  return '';
}

function getArtwork(song) {
  if (song.al && song.al.picUrl) {
    return song.al.picUrl;
  }

  if (song.album && song.album.picUrl) {
    return song.album.picUrl;
  }

  return '';
}

function convertSong(song) {
  if (!song || song.id == null) {
    return null;
  }

  return {
    id: String(song.id),
    platform: PLATFORM,
    title: song.name || '',
    artist: getArtists(song),
    album: getAlbum(song),
    artwork: getArtwork(song),
    duration: song.dt
      ? Math.floor(song.dt / 1000)
      : 0,

    neteaseId: String(song.id),
  };
}

/*
 * 把查询拆成若干关键词。
 *
 * 例如：
 *
 * 周杰伦 七里香
 *
 * 会得到：
 *
 * ["周杰伦", "七里香"]
 */
function splitQuery(query) {
  return String(query || '')
    .trim()
    .split(/\s+/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean);
}

/*
 * 搜索评分。
 *
 * 分数越高越靠前。
 */
function scoreSong(song, query) {
  var q = cleanText(query);

  var title = cleanText(song.title);
  var artist = cleanText(song.artist);
  var album = cleanText(song.album);

  if (!q) {
    return 0;
  }

  var score = 0;

  /*
   * 最高优先级：
   * 歌名完全等于搜索词
   */
  if (title === q) {
    score += 1000;
  }

  /*
   * 歌手完全等于搜索词
   */
  if (artist === q) {
    score += 850;
  }

  /*
   * 专辑完全等于搜索词
   */
  if (album === q) {
    score += 700;
  }

  /*
   * 歌名包含完整关键词
   */
  if (title.indexOf(q) !== -1) {
    score += 600;
  }

  /*
   * 歌手包含完整关键词
   */
  if (artist.indexOf(q) !== -1) {
    score += 500;
  }

  /*
   * 专辑包含关键词
   */
  if (album.indexOf(q) !== -1) {
    score += 300;
  }

  /*
   * 多关键词评分。
   *
   * 例如：
   * 周杰伦 七里香
   */
  var words = splitQuery(query);

  if (words.length > 1) {
    words.forEach(function (word) {
      var w = cleanText(word);

      if (!w) {
        return;
      }

      if (title.indexOf(w) !== -1) {
        score += 180;
      }

      if (artist.indexOf(w) !== -1) {
        score += 160;
      }

      if (album.indexOf(w) !== -1) {
        score += 80;
      }
    });

    /*
     * 如果所有关键词都出现，
     * 额外奖励。
     */
    var allMatched = words.every(
      function (word) {
        var w = cleanText(word);

        return (
          title.indexOf(w) !== -1 ||
          artist.indexOf(w) !== -1 ||
          album.indexOf(w) !== -1
        );
      }
    );

    if (allMatched) {
      score += 500;
    }
  }

  /*
   * 优先正式歌曲。
   *
   * 对 live / remix / instrumental / 伴奏等
   * 不直接删除，只降低排序。
   */
  var lowerTitle = String(
    song.title || ''
  ).toLowerCase();

  var lowerAlbum = String(
    song.album || ''
  ).toLowerCase();

  var specialWords = [
    'live',
    '现场',
    '演唱会',
    'remix',
    '混音',
    'instrumental',
    '伴奏',
    '纯音乐',
    'dj',
    'demo',
    '试听',
  ];

  specialWords.forEach(function (word) {
    if (
      lowerTitle.indexOf(word) !== -1 ||
      lowerAlbum.indexOf(word) !== -1
    ) {
      score -= 35;
    }
  });

  return score;
}

/*
 * 去重。
 *
 * 同一首歌可能因为专辑/版本不同
 * 出现很多重复结果。
 */
function removeDuplicates(list) {
  var map = {};
  var result = [];

  list.forEach(function (item) {
    var key =
      cleanText(item.title) +
      '|' +
      cleanText(item.artist);

    if (!key || key === '|') {
      return;
    }

    /*
     * 完全相同的歌只保留第一条。
     */
    if (!map[key]) {
      map[key] = true;
      result.push(item);
    }
  });

  return result;
}

/*
 * 根据评分排序。
 */
function sortSongs(songs, query) {
  var scored = songs.map(
    function (song, index) {
      return {
        song: song,
        score: scoreSong(
          song,
          query
        ),
        index: index,
      };
    }
  );

  scored.sort(function (a, b) {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    /*
     * 分数相同保持网易云原始顺序。
     */
    return a.index - b.index;
  });

  return scored.map(function (x) {
    return x.song;
  });
}

function emptyResult() {
  return {
    isEnd: true,
    data: [],
  };
}

module.exports = {
  platform: PLATFORM,

  version: '4.0.0',

  author: 'a1134983523-collab',

  description:
    '网易云音乐搜索增强版：关键词匹配、相关性排序、去重。',

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  cacheControl: 'no-store',

  async search(query, page, type) {
    if (!query) {
      return emptyResult();
    }

    page = page || 1;

    /*
     * 当前重点优化歌曲搜索。
     */
    if (type !== 'music') {
      return emptyResult();
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
              type: 1,
            },

            timeout: 20000,
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
        return emptyResult();
      }

      /*
       * 转换歌曲。
       */
      var songs =
        result.result.songs
          .map(convertSong)
          .filter(Boolean);

      /*
       * 先去重。
       */
      songs =
        removeDuplicates(songs);

      /*
       * 再相关性排序。
       */
      songs =
        sortSongs(
          songs,
          query
        );

      /*
       * 最终只返回前 30 条。
       */
      songs =
        songs.slice(0, 30);

      return {
        isEnd:
          result.result.songCount
            ? page * 50 >=
              result.result.songCount
            : songs.length < 30,

        data: songs,
      };
    } catch (error) {
      console.log(
        '[网易云] 搜索失败:',
        error &&
        error.message
          ? error.message
          : error
      );

      return emptyResult();
    }
  },

  /*
   * 播放地址
   */
  async getMediaSource(
    musicItem
  ) {
    var id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      var response =
        await axios.get(
          API +
            '/song/url/v1',
          {
            params: {
              id: id,
              level: 'standard',
            },

            timeout: 20000,
          }
        );

      var data =
        response.data &&
        response.data.data;

      if (
        !Array.isArray(data) ||
        !data.length ||
        !data[0] ||
        !data[0].url
      ) {
        return null;
      }

      return {
        url: data[0].url,
      };
    } catch (error) {
      console.log(
        '[网易云] 播放地址失败:',
        error
      );

      return null;
    }
  },

  /*
   * 歌词
   */
  async getLyric(
    musicItem
  ) {
    var id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      var response =
        await axios.get(
          API + '/lyric',
          {
            params: {
              id: id,
            },

            timeout: 20000,
          }
        );

      var data =
        response.data;

      if (
        !data ||
        !data.lrc ||
        !data.lrc.lyric
      ) {
        return null;
      }

      return {
        rawLrc:
          data.lrc.lyric,

        translation:
          data.tlyric &&
          data.tlyric.lyric
            ? data.tlyric.lyric
            : undefined,
      };
    } catch (error) {
      console.log(
        '[网易云] 歌词失败:',
        error
      );

      return null;
    }
  },
};