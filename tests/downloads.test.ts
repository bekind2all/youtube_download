import { test } from 'node:test';
import assert from 'node:assert/strict';
import { youtubeUrl, formatSelector } from '../downloads';

test('canonicalizes supported video links and discards playlist / other parameters', () => {
  for (const url of ['https://youtu.be/BaW_jenozKc?t=2', 'https://www.youtube.com/watch?v=BaW_jenozKc&list=123', 'https://m.youtube.com/shorts/BaW_jenozKc', 'https://youtube.com/live/BaW_jenozKc']) assert.equal(youtubeUrl(url), 'https://www.youtube.com/watch?v=BaW_jenozKc');
});
test('rejects remote hosts, local networks, credentials, ports, playlists and invalid video IDs', () => {
  for (const url of ['http://youtube.com/watch?v=BaW_jenozKc', 'https://youtube.com.evil.com/watch?v=BaW_jenozKc', 'https://127.0.0.1/', 'file:///etc/passwd', '--exec calc', 'https://user:pass@youtube.com/watch?v=BaW_jenozKc', 'https://youtube.com:444/watch?v=BaW_jenozKc', 'https://youtube.com/playlist?list=123', 'https://youtu.be/invalid']) assert.throws(() => youtubeUrl(url));
});
test('all fallback formats respect the selected height ceiling', () => {
  assert.equal(formatSelector('1080'), 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080][ext=mp4]/bv*[height<=1080]+ba/b[height<=1080]');
  assert.throws(() => formatSelector('1080; calc'));
});
