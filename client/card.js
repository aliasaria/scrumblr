function getCard(id, text, x, y, rot, style, sticker) {
	var ticketNumberRegex = new RegExp("^([A-Z]+-[0-9]+)", 'ig');
	var linksEnabled = text.replace(ticketNumberRegex, "<a href=http://jira.corp.peer1.net/browse/$1>$1</a>");

	var zIndex = Math.round(x + (y * 10));
	if ('postit' == style) zIndex += 10000;
	var cardFileName = style.replace(/^.* /, '') + '-card.png';

	var h = '<div id="' + id + '" ' +
		'class="card ' + style + ' draggable clearfix" ' +
		'style="-webkit-transform:rotate(' + rot + 'deg);z-index:' + zIndex + ';"> ' +
		'<img src="/images/icons/token/Xion.png" class="card-icon delete-card-icon" />' +
		'<img class="card-image" src="/images/' + cardFileName + '">' +
		'<div id="content:' + id + '" class="content stickertarget droppable">' + linksEnabled + '</div>' +
		'</div>';

	return h;
}

module.exports = {
	getCard: getCard
};