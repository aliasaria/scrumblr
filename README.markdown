scrumblr
========

what is it
----------
[scrumblr](http://scrumblr.ca) is a simulation of an agile sprint board. using node.js, websockets (using socket.io), CSS3, and jquery. it is able to synchronize the board across many clients so teams can work collaboratively in real time. i hope you like it.

![Wellca Board](http://scrumblr.ca/images/screenshot.png)

you can play with a demo here:

- [scrumblr.ca/demo](http://scrumblr.ca/demo)

And view a video here:

- [Video Demo](http://www.youtube.com/watch?v=gAKxyOh1zPk)

use scrumblr
------------

if you'd like to use scrumblr for personal use or in your organization, i have a free hosted version at [scrumblr.ca](http://scrumblr.ca). new boards are made simply by modifying the url to something unique. e.g. your team could use a shared board at: *http://scrumblr.ca/thisisoursecretboard23423242*

alternatively, you can follow the instructions below to setup scrumblr yourself. it is very simple -- it just uses redis and node.js.

if you are a developer, please fork and submit changes/fixes.

browser support
---------------

scrumblr works on up to date chrome and firefox browsers. enable websockets for optimal performance. tested mainly on chrome for osx. this was not designed for browser support.

design philosophy
-----------------
my goal was to avoid buttons and ui (almost everything is edit in place or draggable). everything should be discoverable (no "help"). the look is meant to be as close as possible to [Well.ca's](http://well.ca) real sprint board. see picture below. many of the decisions were to make the app look and feel as much as possible like well.ca's real sprint board -- you may find this annoying but we find it kinda funny.

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
- now start redis ($ redis-server)
- now start ($ node server.js 80) where "80" is the port you want it to run on. 

licence
-------

feel free to use scrumblr, its code and the images and design for personal use or at your workplace but you may not sell the images or code including derivatives, on their own, or in a product. if you make changes, please post them on github and retain attribution. and if you are an interesting person or company using scrumblr, think it is cool, or using it in an interesting way, please email me as i'd love to hear about it.

author
------

ali asaria - [well.ca](http://well.ca) - ali@well.ca