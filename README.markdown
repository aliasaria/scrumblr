scrumblr
========

what is it
----------
scrumblr is a simulation of an agile sprint board. using node.js, websockets + CSS3, it is able to synchronize the board across many clients so teams can work collaboratively in real time. i hope you like it.

![Wellca Board](http://scrumblr.ca/images/screenshot.png)

you can play with a demo here:

- http://scrumblr.ca/demo

And view a video here:

- [YouTube Video Demo](http://www.youtube.com/watch?v=gAKxyOh1zPk)

use scrumblr
------------

if you'd like to use scrumblr in your organization, you can use my hosted version at scrumblr.ca. new boards are made simply by modifying the url to something unique. e.g. your team could use a shared board at: scrumblr.ca/thisisoursecretboard23423242

alternatively, you can follow the instructions below to host scrumblr yourself. it is very simple -- it just uses redis and node.js.

browser support
---------------

scrumblr works on up to date chrome and firefox browsers. enable websockets for optimal performance. tested mainly on chrome for osx.


design philosophy
-----------------
my goal was to avoid buttons and ui (everything is edit in place). everything should be discoverable (no "help"). the look is meant to be as close as possible to Well.ca's real sprint board. see picture below. many of the decisions were to make the app look and feel as much as possible like well.ca's real sprint board -- you may find this annoying but we find it kinda funny.

![Wellca Board](http://scrumblr.ca/images/DSC_7093.jpg)


how to install and run on your own computer (linux/osx)
-------------------------------------------------------

- install redis v2.2.2
- install node.js >= 0.4.1
- install npm
- install these npm packages:
	- async
	- express
	- jade
	- redis-client
	- redis
	- sanitizer
	- socket.io
	- (and perhaps more which you will notice when you try to start it)
- now start redis ($redis-server)
- now start ($node server.js 80) where "80" is the port you want it to run on. 