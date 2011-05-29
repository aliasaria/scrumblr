var cards = {};
var totalcolumns = 0;
var columns = [];
var currentTheme = "bigcards";


var socket = new io.Socket(  );
socket.connect();


//an action has happened, send it to the
//server
function sendAction(a, d)
{
	//console.log('--> ' + a);
	
	var message = { 
		action: a,
		data: d
	}
	
	socket.send ( message );
}

socket.on('connect', function(){ 
	//console.log('successful socket.io connect');
	
	//let the path be the room name
	var path = location.pathname;
	
	//imediately join the room which will trigger the initializations
	sendAction('joinRoom', path);
})

socket.on('disconnect', function(){ 
	alert("Server disconnected. Please reload page.");
});

socket.on('message', function(data){ 
	getMessage(data);
})

//respond to an action event
function getMessage( m )
{
	var message = m; //JSON.parse(m);
	var action = message.action;
	var data = message.data;
	
	//console.log('<-- ' + action);
	
	switch (action)
	{
		case 'roomAccept':
			//okay we're accepted, then request initialization
			//(this is a bit of unnessary back and forth but that's okay for now)
			sendAction('initializeMe', null);
			break;
			
		case 'roomDeny':
			//this doesn't happen yet
			break;
			
		case 'moveCard':
			$("#" + data.id).animate({
				left: data.position.left+"px",
				top: data.position.top+"px" 
			}, 500);
			break;
			
		case 'initCards':
			initCards(data);
			break;
		
		case 'createCard':
			//console.log(data);
		   drawNewCard(data.id, data.text, data.x, data.y, data.rot, data.colour, null);
			break;
			
		case 'deleteCard':
			$("#" + data.id).fadeOut(500,
				function() {$(this).remove();}
			);
			break;
			
		case	'editCard':
			$("#" + data.id).children('.content:first').text(data.value);
			break;
			
		case 'initColumns':
			initColumns(data);
			break;
			
		case 'updateColumns':
			initColumns(data);
			break;
			
		case 'changeTheme':
			changeThemeTo(data);
			break;
		
		case 'join-announce':
			displayUserJoined(data.sid, data.user_name);
			break;
			
		case 'leave-announce':
			displayUserLeft(data.sid);
			break;
			
		case 'initialUsers':
			displayInitialUsers(data);
			break;
			
		case 'nameChangeAnnounce':
			updateName( message.data.sid, message.data.user_name );
			break;
			
		case 'addSticker':
			addSticker( message.data.cardId, message.data.stickerId );
			break;
			
		case 'setBoardSize':
			resizeBoard( message.data );
			break;
			
		default:
			//unknown message
			alert('unknown action: ' + JSON.stringify(message));
			break;
	}
	

}



function drawNewCard(id, text, x, y, rot, colour, sticker)
{
	//cards[id] = {id: id, text: text, x: x, y: y, rot: rot, colour: colour};
	
	var h = '<div id="' + id + '" class="card ' + colour + ' draggable" style="-webkit-transform:rotate(' + rot + 'deg);">\
	<img src="/images/icons/token/Xion.png" class="card-icon delete-card-icon" />\
	<img class="card-image" src="/images/' + colour + '-card.png">\
	<div id="content:' + id + '" class="content stickertarget droppable">' + text + '</div>\
	</div>';
	$(h).appendTo('#board');
	
	$( ".card" ).draggable(
		{ 
			snap: false,
			snapTolerance: 5,
			containment: [0,0,2000,2000],
			stack: ".card"
	 	}
	);
	
	//After a drag:
	$( "#" + id ).bind( "dragstop", function(event, ui) {
		var data = {
			id: this.id,
			position: ui.position,
			oldposition: ui.originalPosition,
		};
		
		sendAction('moveCard', data);
	});
	
	$( ".droppable" ).droppable(
		{ 
			accept: '.sticker',
			drop: function( event, ui ) {
							var stickerId = ui.draggable.attr("id");
							var cardId = $(this).parent().attr('id');
							
							addSticker( cardId, stickerId );
							
							var data = { cardId: cardId, stickerId: stickerId };
							
							sendAction('addSticker', data);
						}
	 	}
	);
	
	$("#" + id).animate({
		left: x + "px",
		top: y + "px" 
	}, Math.floor(Math.random() * 1000));
	
	$("#" + id).hover( 
		function(){ 
			$(this).addClass('hover');
			$(this).children('.card-icon').fadeIn(10);
		},
		function(){
			$(this).removeClass('hover');
			$(this).children('.card-icon').fadeOut(150);
		}
	 );
	
	$("#" + id).children('.card-icon').hover(
		function(){
			$(this).addClass('card-icon-hover');
		},
		function(){
			$(this).removeClass('card-icon-hover');
		}
	);
	
	$("#" + id).children('.delete-card-icon').click(
		function(){
			$("#" + id).remove();
			//notify server of delete
			sendAction( 'deleteCard' , { 'id': id });
		}
	);
	
	$("#" + id).children('.content').editable( "/edit-card/" + id,
		{
			style   : 'inherit',
			cssclass   : 'card-edit-form',
			type      : 'textarea',
			placeholder   : 'Double Click to Edit.',
			onblur: 'submit',
			xindicator: '<img src="/images/ajax-loader.gif">',
			event: 'dblclick', //event: 'mouseover'
			callback: onCardChange
		}
	);
	
	//add applicable sticker
	if (sticker != null)
		$("#" + id).children('.content').addClass( sticker );
}


function onCardChange( text, result )
{
	var path = result.target;
	//e.g. /edit-card/card46156244
	var id = path.slice(11);
	
	sendAction('editCard', { id: id, value: text });
	
	
}

function addSticker ( cardId , stickerId ) 
{
	
	cardContent = $('#' + cardId).children('.content');
	
	cardContent.removeClass("sticker-red");
	cardContent.removeClass("sticker-blue");
	cardContent.removeClass("sticker-green");
	cardContent.removeClass("sticker-yellow");
	cardContent.removeClass("sticker-gold");
	cardContent.removeClass("sticker-silverstar");
	cardContent.removeClass("sticker-bluestar");
	cardContent.removeClass("sticker-redstar");
	cardContent.removeClass("sticker-orange");
	cardContent.removeClass("sticker-pink");
	cardContent.removeClass("sticker-purple");
	cardContent.removeClass("sticker-lightblue");
	cardContent.addClass( stickerId );

}


//----------------------------------
// cards
//----------------------------------
function createCard( id, text, x, y, rot, colour )
{
	drawNewCard(id, text, x, y, rot, colour, null);
	
	var action = "createCard";
	
	var data = {
		id: id,
		text: text,
		x: x,
		y: y,
		rot: rot,
		colour: colour
	};
	
	sendAction(action, data);
	
}

function randomCardColour()
{
	var colours = ['yellow', 'green', 'blue', 'white'];
	
	var i = Math.floor(Math.random() * colours.length);
	
	return colours[i];
}


function initCards( cardArray )
{
	cards = cardArray;
	
	for (i in cardArray)
	{
		card = cardArray[i];
		
		drawNewCard(
			card.id,
			card.text,
			card.x,
			card.y,
			card.rot,
			card.colour,
			card.sticker
		);
	}
}


//----------------------------------
// cols
//----------------------------------


function drawNewColumn (columnName)
{	
	var cls = "col";
	if (totalcolumns == 0)
	{
		cls = "col first";
	}
	
	$('#icon-col').before('<td class="' + cls + '" width="10%" style="display:none"><h2 id="col1" class="editable">' + columnName + '</h2></td>');
	
	$('.editable').editable( "/edit-column",
		{
			style   : 'inherit',
			cssclass   : 'card-edit-form',
			type      : 'textarea',
			placeholder   : 'New',
			onblur: 'submit',
			width: '',
			height: '',
			xindicator: '<img src="/images/ajax-loader.gif">',
			event: 'dblclick', //event: 'mouseover'
			callback: onColumnChange
		}
	);
	
	$('.col:last').fadeIn(1500);
	
	totalcolumns ++;
}

function onColumnChange( text, settings )
{
	var names = Array();
	
	//Get the names of all the columns
	$('.col').each(function() {
		names.push(
			$(this).text()
			);
	});
	
	updateColumns(names);
	
	
}

function displayRemoveColumn()
{
	if (totalcolumns <= 0) return false;
	
	$('.col:last').fadeOut( 150,
		function() {
			$(this).remove();
		}
	);
	
	totalcolumns --;
}

function createColumn( name )
{
	if (totalcolumns >= 8) return false;
	
	drawNewColumn( name );
	columns.push(name);
	
	var action = "updateColumns";
	
	var data = columns;
	
	sendAction(action, data);
}

function deleteColumn()
{
	if (totalcolumns <= 0) return false;
	
	displayRemoveColumn();
	columns.pop();
	
	var action = "updateColumns";
	
	var data = columns;
	
	sendAction(action, data);
}

function updateColumns( c )
{
	columns = c;
	
	var action = "updateColumns";
	
	var data = columns;
	
	sendAction(action, data);
}

function deleteColumns( next )
{
	//delete all existing columns:
	$('.col').fadeOut( 'slow', next() );
}

function initColumns( columnArray )
{
	totalcolumns = 0;
	columns = columnArray;
	
	$('.col').remove();
	
	for (i in columnArray)
	{
		column = columnArray[i];

		drawNewColumn(
			column
		);
	}


}




function changeThemeTo( theme )
{
	currentTheme = theme;
	$("link[title=cardsize]").attr("href", "/css/" + theme + ".css");
}


//////////////////////////////////////////////////////////
////////// NAMES STUFF ///////////////////////////////////
//////////////////////////////////////////////////////////



function setCookie(c_name,value,exdays)
{
var exdate=new Date();
exdate.setDate(exdate.getDate() + exdays);
var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
document.cookie=c_name + "=" + c_value;
}

function getCookie(c_name)
{
var i,x,y,ARRcookies=document.cookie.split(";");
for (i=0;i<ARRcookies.length;i++)
{
  x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
  y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
  x=x.replace(/^\s+|\s+$/g,"");
  if (x==c_name)
    {
    return unescape(y);
    }
  }
}


function setName( name )
{
	sendAction( 'setUserName', name );
	
	setCookie('scrumscrum-username', name, 365);
}

function displayInitialUsers (users)
{
	for (i in users)
	{
		//console.log(users);
		displayUserJoined(users[i].sid, users[i].user_name);
	}
}

function displayUserJoined ( sid, user_name )
{
	name = '';
	if (user_name)
		name = user_name;
	else
		name = sid.substring(0,5);
		
	
	$('#names-ul').append('<li id="user-' + sid + '">' + name + '</li>')
}

function displayUserLeft ( sid )
{
	name = '';
	if (name)
		name = user_name;
	else
		name = sid;
		
	var id = '#user-' + sid.toString();
		
	$('#names-ul').children(id).fadeOut( 1000 , function() {
		$(this).remove();
	});
}


function updateName ( sid, name )
{
	var id = '#user-' + sid.toString();
	
	$('#names-ul').children(id).text( name );
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function boardResizeHappened(event, ui)
{
	var newsize = ui.size
	
	sendAction( 'setBoardSize', newsize);
}

function resizeBoard (size) {
	$( ".board-outline" ).animate( { 
		height: size.height,
		width: size.width
	} );
}
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

$(function() {


	$( "#create-card" )
		.click(function() {
			var rotation = Math.random() * 10 - 5; //add a bit of random rotation (+/- 10deg)
			uniqueID = Math.round(Math.random()*99999999); //is this big enough to assure uniqueness?
			//alert(uniqueID);
			createCard( 
				'card' + uniqueID,
				'',
			 	58, 460,
			   rotation,
			   randomCardColour());
		});
		
		
		
		
	// Style changer
	$("#smallify").click(function(){
		if (currentTheme == "bigcards")
		{
			changeThemeTo('smallcards');
		}
		else if (currentTheme == "smallcards")
		{
			changeThemeTo('bigcards');
		}
		/*else if (currentTheme == "nocards")
		{
			currentTheme = "bigcards";
			$("link[title=cardsize]").attr("href", "css/bigcards.css");
		}*/		
		
		sendAction('changeTheme', currentTheme);
		
	
		return false;
	});
		
		
	
	$('#icon-col').hover(
		function() {
			$('.col-icon').fadeIn(10);
		},
		function() {
			$('.col-icon').fadeOut(150);
		}
	);
	
	$('#add-col').click(
		function(){
			createColumn('New');
			return false;
		}
	);
	
	$('#delete-col').click(
		function(){
			deleteColumn();
			return false;
		}
	);
	
	
	// $('#cog-button').click( function(){ 
	// 	$('#config-dropdown').fadeToggle(); 
	// } );
	
	// $('#config-dropdown').hover( 
	// 	function(){ /*$('#config-dropdown').fadeIn()*/ },
	// 	function(){ $('#config-dropdown').fadeOut() } 
	// );
	// 
	
	var user_name = getCookie('scrumscrum-username');
	
	
	
	$("#yourname-input").focus(function()
   {
       if ($(this).val() == 'unknown')
       {
				$(this).val("");
       }
		
		$(this).addClass('focused');

   });
   
   $("#yourname-input").blur(function()
   {
		if ($(this).val() == "")
		{
		    $(this).val('unknown');
		}
		$(this).removeClass('focused');
		
		setName($(this).val());
   });
   
	$("#yourname-input").val(user_name);
   $("#yourname-input").blur();

	$("#yourname-li").hide();

	$("#yourname-input").keypress(function(e)
   {
    	code= (e.keyCode ? e.keyCode : e.which);
    	if (code == 10 || code == 13)
		{
				$(this).blur();
		}
    });



$( ".sticker" ).draggable({ 
	revert: true,
	zIndex: 1000
});


$( ".board-outline" ).resizable( { 
	ghost: false,
	minWidth: 700,
	minHeight: 400 ,
	maxWidth: 3200,
	maxHeight: 1800,
	stop: function(event, ui) { 
		boardResizeHappened(event, ui);
	}
} );


	
});











