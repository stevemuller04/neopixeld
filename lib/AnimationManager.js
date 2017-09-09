const EventEmitter = require("events");

module.exports = class AnimationManager extends EventEmitter {
	constructor(num_pixels) {
		super();
		this.num_pixels = num_pixels;
		this.render_buffer = new Uint32Array(num_pixels);
		this.animations = [];
	}

	startAnimation(animation_model) {
		// For all running animations, disable all pixels involved in the new animation
		for (let pin of animation_model.involved_pixels)
			for (let animation of this.animations)
				animation.disablePixel(pin);

		// Add the animation to the list of running animations
		let animation = new Animation(this.render_buffer, animation_model);
		this.animations.push(animation);

		// Forward render event
		animation.on("render", () => this.emit("render", this.render_buffer));

		// Make sure the animation is removed when it is over
		animation.on("done", () => {
			let i = this.animations.indexOf(animation);
			if (i >= 0)
				this.animations.splice(i, 1);
		});

		// Start the animation
		animation.start();
	}
}

class Animation extends EventEmitter {
	constructor(render_buffer, animation_model) {
		super();
		// const
		this.render_buffer = render_buffer;
		this.animation_model = animation_model;
		// variable
		this.timeout = null;
		this.active_pixels = animation_model.involved_pixels.slice();
		this.running = false;
		this.next_frame_index = 0;
	}

	disablePixel(pixel) {
		let i = this.active_pixels.indexOf(pixel);
		if (i >= 0)
			this.active_pixels.splice(i, 1);
		if (this.active_pixels.length == 0)
			this.abort();
	}

	isPixelActive(pixel) {
		return this.active_pixels.indexOf(pixel) >= 0;
	}

	abort() {
		if (this.running) {
			this.running = false;
			if (this.timeout)
				clearTimeout(this.timeout);
			this.emit("done");
		}
	}

	start() {
		if (this.running)
			return;

		// For the first time, reset the involved pixels
		for (let pixel of this.active_pixels)
			this.render_buffer[pixel] = 0;
		this.emit("render");

		// Start the animation
		this.running = true;
		this.renderNextFrame();
	}

	renderNextFrame() {
		if (!this.running)
			return;

		// Abort if we reached the end and do not repeat the animation
		if (this.next_frame_index >= this.animation_model.frames.length && !this.animation_model.repeat) {
			this.abort();
			return;
		}

		// Get next frame
		this.next_frame_index = this.next_frame_index % this.animation_model.frames.length;
		let frame = this.animation_model.frames[this.next_frame_index++];

		// Draw to buffer
		for (let pixel of Object.keys(frame.pixels)) {
			pixel = parseInt(pixel); // object keys are always strings
			if (this.isPixelActive(pixel))
				this.render_buffer[pixel] = frame.pixels[pixel];
		}

		// Render the buffer
		this.emit("render");

		// Set the timeout for displaying the next frame
		this.timeout = setTimeout(() => {
			if (this.running)
				this.renderNextFrame();
		}, frame.duration);
	}
}
