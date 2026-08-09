const axios = require('axios');

const API = 'https://api.jimsdeng.eu.org';

function makeMusic(item) {
  return {
    id: String(item.id),
    platform: '网易云音乐',
    title: item.name || '',
    artist: item.artists
      ? item.artists.map(function (a) {
          return a.name;
        }).join(' / ')
      : '',
    album: item.album ? item.album.name : '',
    artwork:
      item.album && item.album.picUrl
        ? item.album.picUrl
        : '',
    duration: item.duration
      ? Math.floor(item.duration / 1000)
      : 0,
  };
}

module.exports = {
  platform: '网易云音乐公开源',

  version: '2.0.0',

  author: 'a1134983523-collab',

  description:
    '网易云音乐搜索、歌曲详情、歌词、公开歌单',

  srcUrl:
    'https://github.com/a1134983523-collab/MusicFreePlugins1/raw/main/index.js',

  cacheControl: 'no-store',

  async search(keyword, page, type) {
    if (!keyword || type !== 'music') {
      return {
        isEnd: true,
        data: [],
      };
    }

    var limit = 20;
    var offset = (page - 1) * limit;

    var response = await axios.get(API + '/search', {
      params: {
        keywords: keyword,
        limit: limit,
        offset: offset,
        type: 1,
      },
      timeout: 15000,
    });

    var result = response.data;

    if (
      !result ||
      !result.result ||
      !result.result.songs
    ) {
      return {
        isEnd: true,
        data: [],
      };
    }

    var songs = result.result.songs;

    var data = songs.map(function (song) {
      return makeMusic(song);
    });

    return {
      isEnd: songs.length < limit,
      data: data,
    };
  },

  async getMediaSource(musicItem) {
    var response = await axios.get(
      API + '/song/url/v1',
      {
        params: {
          id: musicItem.id,
          level: 'standard',
        },
        timeout: 15000,
      }
    );

    var data = response.data;

    if (
      !data ||
      !data.data ||
      !data.data.length ||
      !data.data[0] ||
      !data.data[0].url
    ) {
      throw new Error(
        '该歌曲目前没有可用的公开播放地址'
      );
    }

    return {
      url: data.data[0].url,
    };
  },

  async getLyric(musicItem) {
    var response = await axios.get(
      API + '/lyric',
      {
        params: {
          id: musicItem.id,
        },
        timeout: 15000,
      }
    );

    var data = response.data;

    if (!data || !data.lrc) {
      return {
        rawLrc: '',
      };
    }

    return {
      rawLrc: data.lrc.lyric || '',
    };
  },

  async getMusicSheetInfo(url) {
    if (!url) {
      return null;
    }

    var match = url.match(
      /[?&]id=(\d+)/
    );

    if (!match) {
      match = url.match(
        /playlist[\/#](\d+)/
      );
    }

    if (!match) {
      throw new Error(
        '没有识别到网易云歌单 ID'
      );
    }

    var playlistId = match[1];

    var response = await axios.get(
      API + '/playlist/detail',
      {
        params: {
          id: playlistId,
        },
        timeout: 15000,
      }
    );

    var playlist = response.data;

    if (
      !playlist ||
      !playlist.playlist
    ) {
      throw new Error(
        '无法获取网易云歌单'
      );
    }

    var tracks =
      playlist.playlist.tracks || [];

    var musicList = tracks.map(
      function (song) {
        return makeMusic(song);
      }
    );

    return {
      id: String(playlist.playlist.id),
      platform: '网易云音乐公开源',
      title: playlist.playlist.name || '网易云歌单',
      artist:
        playlist.playlist.creator &&
        playlist.playlist.creator.nickname
          ? playlist.playlist.creator.nickname
          : '',
      artwork:
        playlist.playlist.coverImgUrl || '',
      musicList: musicList,
    };
  },
};