const EventEmitter = require("events");
const Animation = require("./Animation.js");

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
