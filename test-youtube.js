const apiKey = process.env.YOUTUBE_API_KEY;
const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
searchUrl.searchParams.append('part', 'snippet');
searchUrl.searchParams.append('type', 'video');
searchUrl.searchParams.append('regionCode', 'KR');
searchUrl.searchParams.append('relevanceLanguage', 'ko');
searchUrl.searchParams.append('maxResults', '10');
searchUrl.searchParams.append('order', 'relevance');
searchUrl.searchParams.append('q', 'test');
searchUrl.searchParams.append('key', apiKey);
console.log(searchUrl.toString());

fetch(searchUrl.toString()).then(r => r.json()).then(console.log);
