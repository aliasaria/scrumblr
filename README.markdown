scrumblr
========

what is it
----------
scrumblr is a simulation of an agile sprint board. using node.js and websockets, it is able to synchronize the board across many clients so teams can work collaboratively in real time. i hope you like it.

you can play with it here:

http://scrumblr.ca/demo

<iframe title="YouTube video player" width="560" height="349" src="http://www.youtube.com/embed/gAKxyOh1zPk?rel=0&amp;hd=1" frameborder="0" allowfullscreen></iframe>

design philosophy
-----------------
my goal was to avoid buttons and ui (everything is edit in place). everything should be discoverable (no "help"). the look is meant to be as close as possible to Well.ca's real sprint board. see picture below.

![Wellca Board](http://scrumblr.ca/DSC_7093.jpg)


how to install and run on your own computer (linux/osx)
-------------------------------------------------------

- install redis 2.2.2
- install node.js > 0.4.1
- install npm
- install these npm packages:
	- async
	- express
	- jade
	- redis-client
	- redis
	- sanitizer
	- socket.io
- now start redis (redis-server)
- now start node server.js 80