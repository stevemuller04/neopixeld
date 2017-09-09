# neopixeld

Neopixeld is a simple daemon that allows remote entities to control an array of Neopixel LEDs via an HTTP API.

## Requirements

In order to run and use Neopixeld, you will need:

* A [Raspberry Pi](https://www.raspberrypi.org/) (any version)
* An array or ring of [Neopixel](https://www.adafruit.com/category/168) LEDs (or compatible)
* [Node.js](https://nodejs.org/) and NPM (Node Package Manager)

## Installation

First clone the Git repository (or download the contained files):

```shell
$ git clone http://github.com/SteveMuller04/neopixeld.git
```

Then install the dependencies:

```shell
$ cd neopixeld/
$ npm install
```

Finally, run the daemon:

```shell
$ node app.js
```

## Usage

Neopixeld listens to HTTP requests of the form

```http
POST /animate HTTP/1.0
Content-Type: application/json;charset=utf-8

[
	{ duration: 0, pixels: { 0: 0xCCCCCC, 1: 0xEEEEEE, ... } }
]
```

More specifically, the following methods are exposed:

* `POST /animate`: To push an animation to the daemon, which loads, plays, and disposes it.
* `POST /animate+repeat` To push an animation to the daemon, which loads and plays the animation indefinitely.

Each of them expects to receive a JSON document in the HTTP body.
The JSON document must be an array consisting of animation frames.

An animation frame is represented by a JSON object that has two keys, `duration` and `pixels`.

* The `duration` value must be a non-negative integer. It describes how much time (in millisends) passes until the next frame is rendered.
* The `pixels` value must be a JSON object, mapping an RGB colour to each LED.
  The keys represent the indices (non-negative integers starting at 0) of the LEDs in the order they appear.
  The values represent the RGB value (expressed as a 32-bit integer) of the colour for the respective LED.

It may be easier to express the colours in hexadecimal format (using `0x...`).
Common RGB values are for instance `0x000000` for black, `0xFF0000` for red, `0x00FF00` for green, and `0x0000FF` for blue.

An example animation can be displayed using:

```json
[
	{ duration: 500, pixels: { 1: 0x0000FF } },
	{ duration: 500, pixels: { 0: 0x0000FF, 1: 0x000000 } },
	{ duration: 0, pixels: { 0: 0x000000 } },
]
```

Once sent to the daemon, the first Neopixel LED will light up in blue.
After 500ms, it will turn off and the second LED will light up in blue.
After yet another 500ms, the second LED will turn off as well.

When sent to the `animate+repeat` method, the animation will repeat indefinitely.
That is, the two LEDs will alternate in 500ms intervals.

# Multiple animations

It is to be noted that later animations will overwrite previous ones.
More precisely, when an animation is pushed to the daemon, all LEDs used by that animation will be reserved
exclusively for that animation. That means that they cannot be set by previous animations anymore.

Example:

> Suppose an animation uses LEDs 0, 1, and 2.
> Suppose another animation is pushed, that uses LEDs 2 and 3.
> Then the first animation will be unable to set LED 2 (all such requests are ignored), although it can still set LEDs 0 and 1.
> If a third animation is pushed, that uses LEDs 0 and 1, then the first animation can no longer set any LEDs.
> It then gets automatically disposed and will no longer use up any resources.

## License

This project is licensed under an MIT license.
See the LICENSE file for a full copy of the license.
