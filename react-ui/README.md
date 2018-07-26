scrumblr
========

update 7/2018 - [mannyhuerta](https://www.github.com/mannyhuerta)
----------
scrumblr has been ported to ReactJS.  this is in effort to make scrumblr more maintainable and easier to enhance using up to date, supported components. here's more changes:

UI:
- ported to ReactJS v16
- mobX for state management
- react-dnd for dragging and dropping
- react-draggable for plain dragging
- react-resizable for resizing the board
- react-router for routing
- REIK for in-line editing

API:
- socket.io upgraded to v2 (native rooms)
- added socket.io redis adaptor for scaling


TODO
----------

- one at a time editing
- private boards
- oauth (to support private boards)