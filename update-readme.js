import fs from "fs";
import fetch from "node-fetch";

const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;
const API_KEY = process.env.YOUTUBE_API_KEY;
const README_FILE_PATH = "./README.md";

async function getLatestVideos() {
	const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=date&maxResults=15`;
	const response = await fetch(url);
	const data = await response.json();

	// Fetch video details to determine if they are Shorts
	const videoDetailsPromises = data.items.map(async (item) => {
		const videoId = item.id.videoId;
		const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${API_KEY}`;
		const videoResponse = await fetch(videoUrl);
		const videoData = await videoResponse.json();
		const duration = videoData.items[0].contentDetails.duration;
		const isShort =
			duration.startsWith("PT") &&
			(duration.includes("S") || duration.includes("M"));

		return {
			...item,
			isShort,
		};
	});

	const videoDetails = await Promise.all(videoDetailsPromises);

	// Filter out Shorts
	const filteredVideos = videoDetails
		.filter((item) => !item.isShort)
		.slice(0, 9);

	return filteredVideos.map((item) => ({
		title: item.snippet.title,
		url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
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