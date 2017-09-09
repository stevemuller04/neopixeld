const EventEmitter = require("events");

module.exports = class Animation extends EventEmitter {
	/**
	 * @param {Uint32Array} render_buffer A reference to the buffer that holds the currently displayed colors of the LEDs.
	 * @param {MAnimation} The model that describes the animation.
	 */
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

	/**
	 * Disables the given pixel so that it will not be changed by this animation anymore.
	 * This method is called by other animations that claimed the pixel for themselves.
	 * If no active pixels remain, this method automatically calls abort().
	 * @param {Number} pixel The index of the pixel.
	 */
	disablePixel(pixel) {
		let i = this.active_pixels.indexOf(pixel);
		if (i >= 0)
			this.active_pixels.splice(i, 1);
		if (this.active_pixels.length == 0)
			this.abort();
	}

	/**
	 * Indicates whether the given pixel has been disabled using disablePixel().
	 * @param {Number} pixel The index of the pixel.
	 * @return {bool} Returns false iff the pixel has been disabled.
	 */
	isPixelActive(pixel) {
		return this.active_pixels.indexOf(pixel) >= 0;
	}

	/**
	 * Stops this animation and disposes all resources.
	 */
	abort() {
		if (this.running) {
			this.running = false;
			if (this.timeout)
				clearTimeout(this.timeout);
			this.emit("done");
		}
	}

	/**
	 * Starts the animation.
	 */
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

	/**
	 * @internal
	 * Renders the next frame in the queue, and postpones showing the following frame.
	 */
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
