const ws281x = require("rpi-ws281x-native");
const Api = require("./lib/Api.js");
const AnimationManager = require("./lib/AnimationManager.js");
const MAnimation = require("./lib/MAnimation.js");

const HTTP_PORT = 8080;
const GPIO_PIN = 18;
const NUM_LEDS = 12;

// Initialize LEDs
ws281x.init(NUM_LEDS, { gpioPin: GPIO_PIN });

// Set-up graceful shutdown
function handleShutdown() {
	ws281x.render(new Uint32Array(NUM_LEDS));
	ws281x.reset();
	process.nextTick(() => process.exit(0));
}
process.on('SIGINT', handleShutdown).on('SIGTERM', handleShutdown);

// Set up components
const animationManager = new AnimationManager(NUM_LEDS);
const api = new Api(NUM_LEDS);
animationManager.on("render", buffer => ws281x.render(buffer));
api.on("animation", animationManager.startAnimation.bind(animationManager));

// Run
api.listen(HTTP_PORT);
