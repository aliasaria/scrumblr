var cards = {};
var columns = [];
var currentTheme = "bigcards";
var boardInitialized = false;
var keyTrap = null;

var baseurl = location.pathname.substring(0, location.pathname.lastIndexOf('/'));
//var socket = io();
// We move socket.io from it's default URL (/socket.io) to (/socketio) because during
// the upgrade to new socket.io, old clients on production server were hitting old
// URL and crashing the server.
var socket = io({
    path: '/socketio'
});

var userCache = {};

//an action has happened, send it to the
//server
function sendAction(a, d) {
    //console.log('--> ' + a);

    var message = {
        action: a,
        data: d
    };

    socket.send(message);
}

socket.on('connect', function() {
    //console.log('successful socket.io connect');

    //let the final part of the path be the room name
    var room = location.pathname.substring(location.pathname.lastIndexOf('/'));

    //imediately join the room which will trigger the initializations
    sendAction('joinRoom', room);
});

socket.on('disconnect', function() {
    blockUI("Server disconnected. Refresh page to try and reconnect...");
    //$('.blockOverlay').click($.unblockUI);
});

socket.on('message', function(data) {
    getMessage(data);
});

function unblockUI() {
    $('.board-outline').trigger('initboard');
    $.unblockUI({fadeOut: 50});
}

function blockUI(message) {
    message = message || 'Waiting...';

    $.blockUI({
        message: message,

        css: {
            border: 'none',
            padding: '15px',
            backgroundColor: '#000',
            '-webkit-border-radius': '10px',
            '-moz-border-radius': '10px',
            opacity: 0.5,
            color: '#fff',
            fontSize: '20px'
        },

        fadeOut: 0,
        fadeIn: 10
    });
}

//respond to an action event
function getMessage(m) {
    var message = m; //JSON.parse(m);
    var action = message.action;
    var data = message.data;

    //console.log('<-- ' + action);
    //console.log(message);

    switch (action) {
        case 'roomAccept':
            //okay we're accepted, then request initialization
            //(this is a bit of unnessary back and forth but that's okay for now)
            sendAction('initializeMe', null);
            break;

        case 'roomDeny':
            //this doesn't happen yet
            break;

        case 'moveCard':
            moveCard($("#" + data.id), data.position);
            break;

        case 'initCards':
            initCards(data);
            break;

        case 'createCard':
            //console.log(data);
            drawNewCard(data.id, data.text, data.x, data.y, data.rot, data.colour, data.type, null,
                null, data.username);
            break;

        case 'deleteCard':
            $("#" + data.id).fadeOut(500,
                function() {
                    $(this).remove();
                }
            );
            break;

        case 'editCard':
            if (data.value) $("#" + data.id).children('.content:first').text(data.value);
            if (data.colour)
            {
                $('#' + data.id).children('.change-colour').data('colour',data.colour);
                $('#' + data.id).children('.card-image').attr("src", 'images/' + data.colour + '-card.png');
            }
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

        case 'changeBg':
            changeBgTo(data);
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
            updateName(message.data.sid, message.data.user_name);
            break;

        case 'updateUserCache':
            updateUserCache(message.data);
            break;

        case 'addSticker':
            addSticker(message.data.cardId, message.data.stickerId);
            break;

        case 'setBoardSize':
            resizeBoard(message.data);
            break;

        case 'editText':
            var item = data.item;
            var text = "";
            if (data.text) { text = data.text; }
            updateText(item, text);
            break;

        default:
            //unknown message
            alert('unknown action: ' + JSON.stringify(message));
            break;
    }


}

function updateText (item, text) {
    if (item == 'board-title' && text != '') {
        $('#board-title').text(text);
    }
}


$(document).bind('keyup', function(event) {
    keyTrap = event.which;
});

function drawNewCard(id, text, x, y, rot, colour, type, sticker, animationspeed, username) {
    //cards[id] = {id: id, text: text, x: x, y: y, rot: rot, colour: colour};

    const userAvatar = userCache[username] ? userCache[username].userAvatar : null;

    var h = '';

    if (type == 'card' || type == null) {
        h = '<div id="' + id + '" class="card ' + colour +
            ' draggable cardstack" style="-webkit-transform:rotate(' + rot +
            'deg);\
        ">\
        <svg class="card-icon delete-card-icon" width="15" height="15"><use xlink:href="teenyicons/teenyicons-outline-sprite.svg#outline--x-circle" /></svg>\
        <svg class="card-icon card-icon2 change-colour" data-colour="' + colour + '" width="15" height="15"><use xlink:href="teenyicons/teenyicons-outline-sprite.svg#outline--paintbrush" /></svg>\
        <img class="card-image" src="images/' + colour + '-card.png">\
        ' + (userAvatar ? ('<img class="card-icon card-avatar" src="' + userAvatar + '">'): '') +
        '<div id="content:' + id +
            '" class="content stickertarget droppable">' +
            text + '</div><span class="filler"></span>\
        </div>';
    }
    else if (type == 'sticky') {
         h = '<div id="' + id + '" class="sticky ' + colour +
         ' draggable cardstack" style="-webkit-transform:rotate(' + rot +
         'deg);\
        ">\
        <svg class="card-icon delete-card-icon" width="15" height="15"><use xlink:href="teenyicons/teenyicons-outline-sprite.svg#outline--x-circle" /></svg>\
        <img class="card-image" src="images/postit/p' + colour + '.png">\
        ' + (userAvatar ? ('<img class="card-icon card-avatar" src="' + userAvatar + '">'): '') +
        '<div id="content:' + id +
            '" class="content stickertarget droppable">' +
            text + '</div><span class="filler"></span>\
        </div>';
    }
    else if (type == 'label') {
        h = '<div id="' + id + '" class="label ' + colour +
            ' draggable cardstack" style="-webkit-transform:rotate(' + rot +
            'deg);\
        ">\
        <svg class="card-icon delete-card-icon" width="15" height="15"><use xlink:href="teenyicons/teenyicons-outline-sprite.svg#outline--x-circle" /></svg>\
        ' + (userAvatar ? ('<img class="card-icon card-avatar" src="' + userAvatar + '">'): '') +
        '<div id="content:' + id +
            '" class="content stickertarget droppable">' +
            text + '</div><span class="filler"></span>\
        </div>';
    }

    var card = $(h);
    card.appendTo('#board');

    //@TODO
    //Draggable has a bug which prevents blur event
    //http://bugs.jqueryui.com/ticket/4261
    //So we have to blur all the cards and editable areas when
    //we click on a card
    //The following doesn't work so we will do the bug
    //fix recommended in the above bug report
    // card.click( function() {
    // 	$(this).focus();
    // } );

    card.draggable({
        snap: false,
        snapTolerance: 5,
        containment: [0, 0, 2000, 2000],
        stack: ".cardstack",
        start: function(event, ui) {
            keyTrap = null;
        },
        drag: function(event, ui) {
            if (keyTrap == 27) {
                ui.helper.css(ui.originalPosition);
                return false;
            }
        },
        handle: "div.content",
        zIndex: 100
    });

    //After a drag:
    card.bind("dragstop", function(event, ui) {
        if (keyTrap == 27) {
            keyTrap = null;
            return;
        }

        if ($(event.target).hasClass("stuck-sticker"))
        {
            //You're dragging a sticker on the card, not the card itself
            //so do not move the card
            //console.log(event);
            if(event.offsetX > 20) console.log('delete!');
            return;
        }

        var data = {
            id: this.id,
            position: ui.position,
            oldposition: ui.originalPosition,
        };

        sendAction('moveCard', data);
    });

    card.children(".droppable").droppable({
        accept: '.sticker',
        drop: function(event, ui) {
            var stickerId = ui.draggable.attr("id");
            var cardId = $(this).parent().attr('id');

            addSticker(cardId, stickerId);

            var data = {
                cardId: cardId,
                stickerId: stickerId
            };
            sendAction('addSticker', data);

            //remove hover state to everything on the board to prevent
            //a jquery bug where it gets left around
            $('.card-hover-draggable').removeClass('card-hover-draggable');
        },
        hoverClass: 'card-hover-draggable'
    });

    var speed = Math.floor(Math.random() * 1000);
    if (typeof(animationspeed) != 'undefined') speed = animationspeed;

    var startPosition = $("#create-card").position();

    card.css('top', startPosition.top - card.height() * 0.5);
    card.css('left', startPosition.left - card.width() * 0.5);

    card.animate({
        left: x + "px",
        top: y + "px"
    }, speed);

    card.hover(
        function() {
            $(this).addClass('hover');
            $(this).children('.card-icon').fadeIn(10);
        },
        function() {
            $(this).removeClass('hover');
            $(this).children('.card-icon').fadeOut(150);
        }
    );

    card.children('.card-icon').hover(
        function() {
            $(this).addClass('card-icon-hover');
        },
        function() {
            $(this).removeClass('card-icon-hover');
        }
    );

    card.children('.delete-card-icon').click(
        function() {
            $("#" + id).remove();
            //notify server of delete
            sendAction('deleteCard', {
                'id': id
            });
        }
    );

    card.children('.change-colour').click(
        function() {
                rotateCardColor(id, $(this).data('colour'));
            });


    card.children('.content').editable({
        multiline: true,
        saveDelay: 600,
        save: function(content) {
            onCardChange(id, content.target.innerText, null);
        }
    });

    //add applicable sticker
    if (sticker)
        addSticker(id, sticker);
}


function onCardChange(id, text, c) {
    sendAction('editCard', {
        id: id,
        value: text,
        colour: c
    });
}

function moveCard(card, position) {
    card.animate({
        left: position.left + "px",
        top: position.top + "px"
    }, 500);
}

function addSticker(cardId, stickerId) {

    stickerContainer = $('#' + cardId + ' .filler');

    if (stickerContainer.length == 0) return;

    if (stickerId === "nosticker") {
        stickerContainer.html("");
        return;
    }


    if (Array.isArray(stickerId)) {
        for (var i in stickerId) {
            stickerContainer.prepend('<img src="images/stickers/' + stickerId[i] +
                '.png" class="stuck-sticker">');
        }
    } else {
        if (stickerContainer.html().indexOf(stickerId) < 0)
            stickerContainer.prepend('<img src="images/stickers/' + stickerId +
                '.png" class="stuck-sticker">');
    }

    $(".stuck-sticker").draggable({
        revert: true,
        zIndex: 1000,
        cursor: "pointer",
    });

}


//----------------------------------
// cards
//----------------------------------
function createCard(id, text, x, y, rot, colour, type) {
    const username = getCookie('adh-username');
    drawNewCard(id, text, x, y, rot, colour, type, null, null, username);

    var action = "createCard";

    var data = {
        id: id,
        text: text,
        x: x,
        y: y,
        rot: rot,
        colour: colour,
        type: type,
        username: getCookie('adh-username')
    };

    sendAction(action, data);

}

var cardColours = ['yellow', 'green', 'blue', 'white'];
var stickyColours = ['1', '2', '3'];


function randomCardColour() {

    var i = Math.floor(Math.random() * cardColours.length);

    return cardColours[i];
}

function randomStickyColour() {

    var i = Math.floor(Math.random() * stickyColours.length);

    return stickyColours[i];
}


function rotateCardColor(id, currentColour) {
    var index = cardColours.indexOf(currentColour.toString());
    //new position:
    var newIndex = index + 1;
    newIndex = newIndex % (stickyColours.length + 1);

    $('#'+id).children('.card-image').attr("src", 'images/' + cardColours[newIndex] + '-card.png');
    $('#'+id).children('.change-colour').data('colour',cardColours[newIndex]);

    //var trueId = id.substr(4); // remove "card" from start of id // no don't do this, server wants "card" in front
    onCardChange(id, null, cardColours[newIndex]);

}


function initCards(cardArray) {
    //first delete any cards that exist
    $('.card').remove();

    cards = cardArray;

    for (var i in cardArray) {
        card = cardArray[i];

        drawNewCard(
            card.id,
            card.text,
            card.x,
            card.y,
            card.rot,
            card.colour,
            card.type,
            card.sticker,
            0,
            card.username
        );
    }

    boardInitialized = true;
    unblockUI();
}


//----------------------------------
// cols
//----------------------------------

function drawNewColumn() {
    var cls = "col";
    var drawn_col_number = $('tr:first').find('td').length - 1;

    if (drawn_col_number === 0) {
        cls = "col first";
    }

    var columnName = 'New';
    var colId = drawn_col_number + 1;

    $('tr').each(function() {
      var newTd = $('<td class="' + cls +
          '" width="10%"><h2 ' +
          ' class="editable column-editable" data-col="' + colId + '">' + columnName + '</h2></td>');
      $( this ).find('#icon-col').before(newTd);

      newTd.hide();
      $( this ).find('.col:last').fadeIn(1500);
    });

    /*$('#icon-col').before('<td class="' + cls +
        '" width="10%" style="display:none"><h2 id="col-' + (totalcolumns + 1) +
        '" class="editable column-editable">' + columnName + '</h2></td>');*/

    refreshEditable();

    //$('.col:last').fadeIn(1500);
}

function refreshEditable(){
  $('.editable').editable({
      multiline: false,
      save: function(content) {
          const colId = parseInt($(this).attr('data-col'));
          const rowId = parseInt($(this).parents('tr:first').attr('data-row'));
          onColumnChange(colId, rowId, content.target.innerText);
      }
  });
}

function setCellText(colId, rowId, text){
  const row = $('tr[data-row=' + rowId + ']');
  const col = row.find('h2[data-col=' + colId + ']');
  col.text(text);
}

function onColumnChange(colId, rowId, text) {

    console.log(text);
    columns[colId - 1][rowId - 1] = text;
    updateColumns(columns);
}

function displayRemoveColumn() {
    if (columns.length <= 0) return false;

    $('tr').each(function(){
      $(this).find('.col:last').fadeOut(150,
          function() {
              $(this).remove();
          }
      );
    });

}

function displayRemoveRow() {
    if (columns.length <= 0) return false;
    if (columns[0].length <= 1) return false;

    $('tr:last').fadeOut(150,
        function() {
            $(this).remove();
        }
    );

}

function createColumn() {
    if (columns.length >= 8) return false;

    drawNewColumn();
    if (columns.length){
      // Create a copy of the first col
      var newCol = columns[0].map((x) => x);
      columns.push(newCol);
    }
    else {
      columns.push(['New']);
    }

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}

function deleteColumn() {
    if (columns.length <= 0) return false;

    displayRemoveColumn();
    columns.pop();

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}


function deleteRow() {
    if (columns.length <= 0) return false;
    if (columns[0].length == 1)
      return deleteColumn();
    if (columns[0].length <= 0) return false;

    displayRemoveRow();
    columns.forEach(function(col){
      col.pop();
    });

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}


function drawNewRow() {

    var line = $('tr:last');
    var newLine = line.clone();
    newLine.find('.col').css('opacity', '1');
    var latestRowId = parseInt(newLine.attr('data-row'));
    newLine.attr('data-row', latestRowId + 1);
    newLine.insertAfter(line);
    newLine.hide();
    newLine.fadeIn(1500);

    rowCount = $('tr').length;

    $('tr td:last-child').hide();
    $('tr:first td:last-child').attr('rowspan', rowCount).show();

    refreshEditable();

}

function createRow() {
  if (!columns.length){
    return createColumn();
  }
  const totalrows = columns[0].length;

  if (totalrows >= 4) return false;

  drawNewRow();

  columns.forEach(function(col){
    col.push('New');
  });

  var action = "updateColumns";

  var data = columns;

  sendAction(action, data);

}

function updateColumns(c) {
    columns = c;

    var action = "updateColumns";

    var data = columns;

    sendAction(action, data);
}

function deleteColumns(next) {
    //delete all existing columns:
    $('.col').fadeOut('slow', next());
}

function initColumns(columnArray) {
    columns = columnArray;

    // Remove all cols
    $('.col').remove();
    // Remove all rows except first
    $("tr:not(:first)").remove();

    // Init cols and rows
    if (columnArray.length){
      columnArray.forEach(drawNewColumn);
      for (var i=0; i < columnArray[0].length - 1; i++)
        drawNewRow();
    }

    for (var i in columns){
      const col = columns[i];
      for (var j in col){
        setCellText(parseInt(i)+1, parseInt(j)+1, col[j]);
      }
    }

}


function changeThemeTo(theme) {
    currentTheme = theme;
    $("link[title=cardsize]").attr("href", "css/" + theme + ".css");
}


function changeBgTo(bgUrl) {
    $("#board-doodles").css(
      "background-image",
      "url('" + bgUrl + "')"
    );
}


//////////////////////////////////////////////////////////
////////// NAMES STUFF ///////////////////////////////////
//////////////////////////////////////////////////////////



function setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = escape(value) + ((exdays === null) ? "" : "; expires=" +
        exdate.toUTCString());
    document.cookie = c_name + "=" + c_value;
}

function getCookie(c_name) {
    var i, x, y, ARRcookies = document.cookie.split(";");
    for (i = 0; i < ARRcookies.length; i++) {
        x = ARRcookies[i].substr(0, ARRcookies[i].indexOf("="));
        y = ARRcookies[i].substr(ARRcookies[i].indexOf("=") + 1);
        x = x.replace(/^\s+|\s+$/g, "");
        if (x == c_name) {
            return unescape(y);
        }
    }
}


function setName(name) {
    sendAction('setUserName', name);

    setCookie('scrumscrum-username', name, 365);
}

function updateUserInfo() {
    const username = getCookie('adh-username');
    const userEmail = getCookie('adh-email');
    const userAvatar = getCookie('adh-avatar');
    sendAction('setUserInfo', {
      username,
      userEmail,
      userAvatar
    });
    userCache[username] = {
      username,
      userEmail,
      userAvatar
    };
}

function updateUserCache(users) {
  userCache = users;
}

function displayInitialUsers(users) {
    for (var i in users) {
        //console.log(users);
        displayUserJoined(users[i].sid, users[i].user_name);
    }
}

function displayUserJoined(sid, user_name) {
    name = '';
    if (user_name)
        name = user_name;
    else
        name = sid.substring(0, 5);


    $('#names-ul').append('<li id="user-' + sid + '">' + name + '</li>');
}

function displayUserLeft(sid) {
    name = '';
    if (name)
        name = user_name;
    else
        name = sid;

    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).fadeOut(1000, function() {
        $(this).remove();
    });
}


function updateName(sid, name) {
    var id = '#user-' + sid.toString();

    $('#names-ul').children(id).text(name);
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function boardResizeHappened(event, newSize) {
    sendAction('setBoardSize', newSize);
}

function resizeBoard(size) {
    // $(".board-outline").animate({
    //     height: size.height,
    //     width: size.width
    // });

    $(".board-outline").height(size.height);
    $(".board-outline").width(size.width);

    $('.board-outline').trigger('initboard');


}
//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

function calcCardOffset() {
    var offsets = {};
    $(".card,.sticky").each(function() {
        var card = $(this);
        $(".col").each(function(i) {
            var col = $(this);
            if (col.offset().left + col.outerWidth() > card.offset().left +
                card.outerWidth() || i === $(".col").length - 1) {
                offsets[card.attr('id')] = {
                    col: col,
                    x: ((card.offset().left - col.offset().left) / col.outerWidth())
                };
                return false;
            }
        });
    });
    return offsets;
}


//moves cards with a resize of the Board
//doSync is false if you don't want to synchronize
//with all the other users who are in this room
function adjustCard(offsets, doSync) {
    $(".card,.sticky").each(function() {
        var card = $(this);
        var offset = offsets[this.id];
        if (offset) {
            var data = {
                id: this.id,
                position: {
                    left: offset.col.position().left + (offset.x * offset.col
                        .outerWidth()),
                    top: parseInt(card.css('top').slice(0, -2))
                },
                oldposition: {
                    left: parseInt(card.css('left').slice(0, -2)),
                    top: parseInt(card.css('top').slice(0, -2))
                }
            }; //use .css() instead of .position() because css' rotate
            //console.log(data);
            if (!doSync) {
                card.css('left', data.position.left);
                card.css('top', data.position.top);
            } else {
                //note that in this case, data.oldposition isn't accurate since
                //many moves have happened since the last sync
                //but that's okay becuase oldPosition isn't used right now
                moveCard(card, data.position);
                sendAction('moveCard', data);
            }

        }
    });
}

//adjusts the marker and eraser after a board resize
function adjustMarker(originalSize, newSize) {
    //remove any y positioning. Makes a harsh jump but works as a hack
    $("#marker,#eraser").css('top','');
    // console.log( "markerleft: " + $('#marker').css('left') );
    // console.log( "size: " + newSize.width);

    //if either has gone over the edge of the board, just bring it in
    if ( parseFloat($('#marker').css('left')) > newSize.width - 100)
    {
        $('#marker').css('left', newSize.width-100 + 'px' );
    }
    if ( parseFloat($('#eraser').css('left')) > newSize.width - 100)
    {
        $('#eraser').css('left', newSize.width-100 + 'px' );
    }
}


function fullscreenMode() {
    var offsets = calcCardOffset();
    var size = {
      width: $(window).width() - 32,
      height: $(window).height() - 85
    };
    resizeBoard(size);
    boardResizeHappened(null, size);
    adjustCard(offsets, true);
}

//////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////

$(function() {


	//disable image dragging
	//window.ondragstart = function() { return false; };


    if (boardInitialized === false)
        blockUI('<img src="images/ajax-loader.gif" width=43 height=11/>');

    //setTimeout($.unblockUI, 2000);


    $("#create-card")
        .click(function() {
            var rotation = Math.random() * 10 - 5; //add a bit of random rotation (+/- 5deg)
            uniqueID = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?
            //alert(uniqueID);
            createCard(
                'card' + uniqueID,
                '',
                58, $('div.board-outline').height(), // hack - not a great way to get the new card coordinates, but most consistant ATM
                rotation,
                randomCardColour(),
                "card");
        });

    $("#create-sticky")
        .click(function() {
            var rotation = Math.random() * 4 - 2; //add a bit of random rotation (+/- 2deg)
            uniqueID = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?
            //alert(uniqueID);
            createCard(
                'card' + uniqueID,
                '',
                58, $('div.board-outline').height(), // hack - not a great way to get the new card coordinates, but most consistant ATM
                rotation,
                randomStickyColour(),
                "sticky");
        });


    $("#create-label")
        .click(function() {
            var rotation = Math.random() * 4 - 2; //add a bit of random rotation (+/- 2deg)
            uniqueID = Math.round(Math.random() * 99999999); //is this big enough to assure uniqueness?
            //alert(uniqueID);
            createCard(
                'card' + uniqueID,
                '',
                58, $('div.board-outline').height(), // hack - not a great way to get the new card coordinates, but most consistant ATM
                rotation,
                randomStickyColour(),
                "label");
        });



    // Style changer
    $("#smallify").click(function() {

        var newBoardSize = {};
        var oldWidth = $(".board-outline").width();
        var oldHeight = $(".board-outline").height();

        var offsets = calcCardOffset();

        if (currentTheme == "bigcards") {
            changeThemeTo('smallcards');
            newBoardSize.height = oldHeight / 1.5;
            newBoardSize.width = oldWidth / 1.5;
        } else if (currentTheme == "smallcards") {
            changeThemeTo('bigcards');
            newBoardSize.height = oldHeight * 1.5;
            newBoardSize.width = oldWidth * 1.5; 
        }
        /*else if (currentTheme == "nocards")
		{
			currentTheme = "bigcards";
			$("link[title=cardsize]").attr("href", "css/bigcards.css");
        }*/

        resizeBoard(newBoardSize);
        boardResizeHappened(null, newBoardSize);
        adjustCard(offsets, true);


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

    $('.line-buttons').hover(
        function() {
            $('.line-icon').fadeIn(10);
        },
        function() {
            $('.line-icon').fadeOut(150);
        }
    );

    $('#add-col').click(
        function() {
            createColumn();
            return false;
        }
    );

    $('#delete-col').click(
        function() {
            deleteColumn();
            return false;
        }
    );

    $('#add-line').click(
        function() {
            createRow();
            return false;
        }
    );

    $('#delete-line').click(
        function() {
            deleteRow();
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



    $("#yourname-input").focus(function() {
        if ($(this).val() == 'unknown') {
            $(this).val("");
        }

        $(this).addClass('focused');

    });

    $("#yourname-input").blur(function() {
        if ($(this).val() === "") {
            $(this).val('unknown');
        }
        $(this).removeClass('focused');

        setName($(this).val());
    });

    $("#yourname-input").val(user_name);
    $("#yourname-input").blur();

    $("#yourname-li").hide();

    $("#yourname-input").keypress(function(e) {
        code = (e.keyCode ? e.keyCode : e.which);
        if (code == 10 || code == 13) {
            $(this).blur();
        }
    });



    $(".sticker").draggable({
        revert: true,
        zIndex: 1000
    });


    $(".board-outline").resizable({
        ghost: false,
        minWidth: 700,
        minHeight: 400,
        maxWidth: 3200,
        maxHeight: 1800,
    });

    //A new scope for precalculating
    (function() {
        var offsets;

        $(".board-outline").bind("resizestart", function() {
            offsets = calcCardOffset();
        });
        $(".board-outline").bind("resize", function(event, ui) {
            adjustCard(offsets, false);
        });
        $(".board-outline").bind("resizestop", function(event, ui) {
            boardResizeHappened(event, ui.size);
            adjustCard(offsets, true);
            adjustMarker(ui.originalSize, ui.size);
        });
    })();



    $('#marker').draggable({
        axis: 'x',
        containment: 'parent'
    });

    $('#eraser').draggable({
        axis: 'x',
        containment: 'parent'
    });



    $( "#menu" ).menu();
    $('#configmenu').click(function() {
        $('#menu').show();
    });
    $(document.body).click(function() {
        $('#menu').hide();
    });
    $("#menu,#configmenu").click( function(e) {
        e.stopPropagation(); // this stops the event from bubbling up to the body
    });

    $(".ceditable").editable({
        multiline: false,
        saveDelay: 600, //wait 600ms before calling "save" callback
        autoselect: false, //select content automatically when editing starts
        save: function(content) {
            //here you can save content to your MVC framework's model or send directly to server...
            //console.log(content);

            var action = "editText";

            var data = {
                item: 'board-title',
                text: content.target.innerText
            };

            if (content.target.innerText.length > 0)
                sendAction(action, data);
        },
        validate: function(content) {
            //here you can validate content using RegExp or any other JS code to return false for invalid input
            return content !== "";
        }
    });


});
