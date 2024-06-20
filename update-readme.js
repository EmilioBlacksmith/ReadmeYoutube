import fetch from "node-fetch";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID;

async function getLatestVideos() {
	try {
		// Fetch videos from the channel sorted by upload date (latest videos first)
		const url = `https://www.googleapis.com/youtube/v3/search?key=${YOUTUBE_API_KEY}&channelId=${YOUTUBE_CHANNEL_ID}&part=snippet,id&order=viewCount&maxResults=15`;
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch latest YouTube videos: ${response.status} ${response.statusText}`
			);
		}
		const data = await response.json();

		// Extract video ids
		const videoIds = data.items.map((item) => item.id.videoId).join(",");

		// Fetch video details to get durations
		const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?key=${YOUTUBE_API_KEY}&id=${videoIds}&part=contentDetails`;
		const videoDetailsResponse = await fetch(videoDetailsUrl);
		if (!videoDetailsResponse.ok) {
			throw new Error(
				`Failed to fetch video details: ${videoDetailsResponse.status} ${videoDetailsResponse.statusText}`
			);
		}
		const videoDetailsData = await videoDetailsResponse.json();

		// Filter out videos with duration less than 1 minute (60 seconds)
		const filteredVideos = data.items.filter((item, index) => {
			const duration = videoDetailsData.items[index].contentDetails.duration;
			const durationInSeconds = parseDuration(duration);
			return durationInSeconds >= 60; // Filter videos with duration >= 60 seconds
		});

		return filteredVideos;
	} catch (error) {
		console.error("Error fetching latest YouTube videos:", error.message);
		throw error;
	}
}

function parseDuration(duration) {
	const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
	const hours = parseInt(match[1]) || 0;
	const minutes = parseInt(match[2]) || 0;
	const seconds = parseInt(match[3]) || 0;
	return hours * 3600 + minutes * 60 + seconds;
}

async function updateREADME(videos) {
	try {
		const videoLinks = videos
			.map((video, index) => {
				const title = video.snippet.title.replace(/"/g, '\\"');
				const thumbnail = video.snippet.thumbnails.medium.url;
				const videoUrl = `https://www.youtube.com/watch?v=${video.id.videoId}`;
				return `[![${title}](${thumbnail})](${videoUrl})`;
			})
			.join("");

		// Read current README.md content
		let readmeContent = fs.readFileSync("./README.md", "utf-8");

		// Regex pattern to find existing video links section
		const pattern =
			/<!-- YOUTUBE-LATEST-VIDEOS:START -->([\s\S]*?)<!-- YOUTUBE-LATEST-VIDEOS:END -->/;
		const existingLinksMatch = readmeContent.match(pattern);

		if (existingLinksMatch && existingLinksMatch.length > 0) {
			const existingVideoLinks = existingLinksMatch[1].trim();

			// Compare current and existing video links
			if (existingVideoLinks === videoLinks.trim()) {
				console.log("No new videos to update in README.md");
				return; // Exit function early if no changes
			}
		}

		// Replace existing latest videos section or add if not present
		readmeContent = readmeContent.replace(
			pattern,
			`<!-- YOUTUBE-LATEST-VIDEOS:START -->\n\n${videoLinks}\n\n<!-- YOUTUBE-LATEST-VIDEOS:END -->`
		);

		// Write updated content back to README.md
		fs.writeFileSync("./README.md", readmeContent);

		console.log("README.md updated successfully with latest videos!");
	} catch (error) {
		console.error("Error updating README.md:", error);
		throw error;
	}
}

async function main() {
	try {
		const latestVideos = await getLatestVideos();
		await updateREADME(latestVideos);
	} catch (error) {
		console.error("Failed to update README.md with latest videos:", error);
		process.exit(1);
	}
}

main();
