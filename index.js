const axios = require('axios');

const API = 'https://www.cyanyun.com/api';
const PLATFORM = '网易云音乐';

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u3000\s]+/g, '')
    .replace(/[《》「」『』【】（）()［］[\]{}<>]/g, '')
    .replace(/[·•・,，.。!！?？:：;；/\\|_-]/g, '');
}

function getArtist(song) {
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
    artist: getArtist(song),
    album: getAlbum(song),
    artwork: getArtwork(song),
    duration: song.dt
      ? Math.floor(song.dt / 1000)
      : 0,

    neteaseId: String(song.id),
  };
}

function splitQuery(query) {
  return String(query || '')
    .trim()
    .split(/\s+/)
    .map(function (x) {
      return x.trim();
    })
    .filter(Boolean);
}

function isSpecial(song) {
  const text = (
    String(song.title || '') +
    ' ' +
    String(song.album || '')
  ).toLowerCase();

  const words = [
    'live',
    '现场',
    '演唱会',
    'remix',
    '混音',
    'dj',
    'demo',
    '伴奏',
    'instrumental',
    '纯音乐',
    '翻唱',
    'cover'
  ];

  return words.some(function (word) {
    return text.indexOf(word) !== -1;
  });
}

function scoreSong(song, query) {
  const q = normalize(query);

  const title = normalize(song.title);
  const artist = normalize(song.artist);
  const album = normalize(song.album);

  let score = 0;

  if (!q) {
    return 0;
  }

  if (title === q) {
    score += 10000;
  } else if (title.indexOf(q) !== -1) {
    score += 7000;
  }

  if (artist === q) {
    score += 5000;
  } else if (artist.indexOf(q) !== -1) {
    score += 3000;
  }

  if (album === q) {
    score += 2000;
  } else if (album.indexOf(q) !== -1) {
    score += 800;
  }

  const parts = splitQuery(query);

  if (parts.length > 1) {
    let matched = 0;

    parts.forEach(function (part) {
      const p = normalize(part);

      if (!p) {
        return;
      }

      if (title.indexOf(p) !== -1) {
        score += 2500;
        matched++;
      } else if (artist.indexOf(p) !== -1) {
        score += 2200;
        matched++;
      } else if (album.indexOf(p) !== -1) {
        score += 500;
        matched++;
      }
    });

    if (matched === parts.length) {
      score += 6000;
    }

    if (matched === 0) {
      score -= 10000;
    }
  }

  if (isSpecial(song)) {
    score -= 1200;
  }

  if (song.artwork) {
    score += 50;
  }

  return score;
}

function deduplicate(songs) {
  const map = {};
  const result = [];

  songs.forEach(function (song) {
    const key =
      normalize(song.title) +
      '|' +
      normalize(song.artist);

    if (!key || key === '|') {
      return;
    }

    if (map[key]) {
      return;
    }

    map[key] = true;
    result.push(song);
  });

  return result;
}

function rankSongs(songs, query) {
  return songs
    .map(function (song, index) {
      return {
        song: song,
        score: scoreSong(song, query),
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

function emptyResult() {
  return {
    isEnd: true,
    data: []
  };
}

module.exports = {
  platform: PLATFORM,

  version: '6.0.0',

  author: 'a1134983523-collab',

  description:
    '网易云音乐搜索、歌词及公开可访问播放源',

  srcUrl:
    'https://raw.githubusercontent.com/a1134983523-collab/MusicFreePlugins1/main/index.js',

  async search(query, page, type) {
    if (!query) {
      return emptyResult();
    }

    page = page || 1;

    if (type && type !== 'music') {
      return emptyResult();
    }

    try {
      const response = await axios.get(
        API + '/search',
        {
          params: {
            keywords: query,
            limit: 50,
            offset: (page - 1) * 50,
            type: 1
          },
          timeout: 20000
        }
      );

      const result = response.data;

      if (
        !result ||
        !result.result ||
        !Array.isArray(result.result.songs)
      ) {
        return emptyResult();
      }

      let songs = result.result.songs
        .map(convertSong)
        .filter(Boolean);

      songs = deduplicate(songs);

      songs = rankSongs(
        songs,
        query
      );

      songs = songs.slice(0, 30);

      return {
        isEnd: songs.length < 30,
        data: songs
      };
    } catch (error) {
      console.log(
        '[网易云] 搜索失败:',
        error && error.message
          ? error.message
          : error
      );

      return emptyResult();
    }
  },

  async getMediaSource(musicItem) {
    const id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      /*
       * 使用网易云新版播放地址接口。
       *
       * standard = 标准音质
       */
      const response = await axios.get(
        API + '/song/url/v1',
        {
          params: {
            id: id,
            level: 'standard'
          },
          timeout: 20000
        }
      );

      const result = response.data;

      if (
        !result ||
        !Array.isArray(result.data) ||
        result.data.length === 0
      ) {
        return null;
      }

      const item = result.data[0];

      if (!item || !item.url) {
        return null;
      }

      return {
        url: item.url
      };
    } catch (error) {
      console.log(
        '[网易云] 获取播放地址失败:',
        error && error.message
          ? error.message
          : error
      );

      return null;
    }
  },

  async getLyric(musicItem) {
    const id =
      musicItem.neteaseId ||
      musicItem.id;

    if (!id) {
      return null;
    }

    try {
      const response = await axios.get(
        API + '/song/lyric',
        {
          params: {
            id: id
          },
          timeout: 20000
        }
      );

      const result = response.data;

      if (
        !result ||
        !result.lrc ||
        !result.lrc.lyric
      ) {
        return null;
      }

      return {
        rawLrc: result.lrc.lyric,

        translation:
          result.tlyric &&
          result.tlyric.lyric
            ? result.tlyric.lyric
            : undefined
      };
    } catch (error) {
      console.log(
        '[网易云] 获取歌词失败:',
        error && error.message
          ? error.message
          : error
      );

      return null;
    }
  }
};