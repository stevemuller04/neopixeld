const http = require("http");
const EventEmitter = require("events");
const MAnimation = require("./MAnimation.js");
const MAnimationFrame = require("./MAnimationFrame.js");

module.exports = class Api extends EventEmitter {
	constructor(num_pixels) {
		super();
		this.num_pixels = num_pixels;
		this.server = http.createServer((request, response) => handleHttp(request, response, this.handleAnimate.bind(this)));
	}

	/**
	 * Starts the server.
	 * @param {Number} port The HTTP port on which the server shall listen.
	 */
	listen(port) {
		this.server.listen(port);
	}

	/**
	 * @internal
	 * Handles a request for starting an animation.
	 * @param {MAnimationFrame[]} A collection of animation frames that describe the animation.
	 * @param {bool} with_repeat True iff the animation should repeat indefinitely.
	 * @return {string} Returns the error message, if the provided input is invalid. Returns an empty string otherwise.
	 */
	handleAnimate(frames, with_repeat) {
		if (!Array.isArray(frames))
			return "POST data must be an array of animation frames"

		let animation = new MAnimation();
		animation.repeat = with_repeat;

		// Read each frame
		for (let i = 0; i < frames.length; i++) {
			let animationFrame = new MAnimationFrame();
			animation.frames.push(animationFrame);

			if (typeof frames[i] != "object")
				return "Frame #" + i + " must be an object, got " + (typeof frames[i]) + ".";

			// Read 'duration' property
			if (!frames[i].hasOwnProperty("duration"))
				return "Missing 'duration' property in frame #" + i + ".";
			if ((animationFrame.duration = parseFloat(frames[i].duration)) === NaN || animationFrame.duration < 0)
				return "Value of 'duration' property in frame #" + i + " must be a non-negative float.";

			// Read 'pixels' property
			if (!frames[i].hasOwnProperty("pixels"))
				return "Missing 'pixels' property in frame #" + i + ".";
			if (typeof frames[i].pixels != "object")
				return "Value of 'pixels' property in frame #" + i + " must be an object, got " + (typeof frames[i].pixels) + ".";

			// Read individual pixels
			for (let key of Object.keys(frames[i].pixels)) {
				let index = parseInt(key);
				let value = parseInt(frames[i].pixels[key]);
				if (index === NaN || index < 0)
					return "Bad pixel ID in frame #" + i + ": '" + key + "' (must be a non-negative integer).";
				if (index >= this.num_pixels)
					return "Bad pixel ID in frame #" + i + ": '" + key + "' does not exist (max " + this.num_pixels + ").";
				if (value === NaN || value < 0 || value > 0xFFFFFF)
					return "Bad pixel color in frame #" + i + ": pixel #" + key + " must be between 0x000000 and 0xFFFFFF.";
				animationFrame.pixels[index] = value;

				// Keep track of involved pixels
				if (animation.involved_pixels.indexOf(index) < 0)
					animation.involved_pixels.push(index);
			}
		}

		this.emit("animation", animation);
		return ""; // success
	}
};

function handleHttp(request, response, callback) {
	response.setHeader("Content-Type", "text/plain;charset=utf-8");
	if (request.method == "POST" && (request.url == "/animate" || request.url == "/animate+repeat")) {
		processPostRequest(request, response, data => {
			try {
				let error = callback(data, request.url == "/animate+repeat");
				if (error.length == 0) {
					response.writeHead(200);
					response.end();
				}
				else {
					response.writeHead(400);
					response.end("Bad request\r\n" + error);
				}
			} catch (e) {
				response.writeHead(500);
				response.end("Internal server error\r\n" + e);
				response.end();
			}
		})
	}
	else {
		response.writeHead(404);
		response.end();
	}
}

function processPostRequest(request, response, callback) {
	let body = "";
	request.on("data", data => {
		body += data;
		if (body.length > 1e6) {
			body = "";
			response.writeHead(413);
			response.end();
			request.connection.destroy();
		}
	});
	request.on("end", () => {
		let bodyObject;
		try {
			bodyObject = JSON.parse(body);
		} catch (e) {
			response.writeHead(422);
			response.end();
			return;
		}
		callback(bodyObject);
	});
}