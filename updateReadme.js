import fs from "fs";
import fetch from "node-fetch";

const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const API_KEY = process.env.YOUTUBE_API_KEY;
const README_FILE_PATH = "./README.md";

async function getVideoDetails(videoIds) {
	const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds.join(
		","
	)}&key=${API_KEY}`;
	const response = await fetch(url);
	const data = await response.json();

	return data.items.map((item) => {
		const duration = item.contentDetails.duration;

		const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
		const hours = parseInt(match[1]) || 0;
		const minutes = parseInt(match[2]) || 0;
		const seconds = parseInt(match[3]) || 0;
		const totalSeconds = hours * 3600 + minutes * 60 + seconds;

		const isVertical = item.contentDetails.definition === "vertical";
		const isShort = totalSeconds < 60 && isVertical;

		return {
			id: item.id,
			duration: item.contentDetails.duration,
			isShort,
		};
	});
}

async function getLatestVideos() {
	const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=15`;
	const response = await fetch(url);
	const data = await response.json();

	const videoIds = data.items.map((item) => item.id.videoId);
	const videoDetails = await getVideoDetails(videoIds);

	return data.items
		.filter((item, index) => !videoDetails[index].isShort)
		.slice(0, 9)
		.map((item, index) => ({
			title: item.snippet.title,
			url: `https://www.youtube.com/watch?v=${videoDetails[index].id}`,
			thumbnail: item.snippet.thumbnails.medium.url,
		}));
}

async function updateReadme() {
	const videos = await getLatestVideos();
	const readmeContent = fs.readFileSync(README_FILE_PATH, "utf-8");

	const newVideosMarkdown = videos
		.map((video) => {
			return `
<a href="${video.url}" target="_blank">
  <img src="${video.thumbnail}" alt="${video.title}" width="200" />
</a>`;
		})
		.join("\n");

	const newContent = readmeContent.replace(
		/<!-- YOUTUBE-VIDEOS:START -->([\s\S]*?)<!-- YOUTUBE-VIDEOS:END -->/,
		`<!-- YOUTUBE-VIDEOS:START -->\n${newVideosMarkdown}\n<!-- YOUTUBE-VIDEOS:END -->`
	);

	fs.writeFileSync(README_FILE_PATH, newContent);
}

updateReadme().catch((err) => console.error(err));
