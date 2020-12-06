
$(function() {
    var canvas = document.getElementById('signature-pad');

    var signaturePad = new SignaturePad(canvas, {
        //backgroundColor: 'rgb(255, 255, 255)' // necessary for saving image as JPEG; can be removed is only saving as PNG or SVG
        penColor: "rgb(45,184,159)" 
    });

    

    // Adjust canvas coordinate space taking into account pixel ratio,
    // to make it look crisp on mobile devices.
    // This also causes canvas to be cleared.
    function resizeCanvas() {
        // When zoomed out to less than 100%, for some very strange reason,
        // some browsers report devicePixelRatio as less than 1
        // and only part of the canvas is cleared then.
        // I comment this out as it was clearing the drawing



        var ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.getContext("2d").scale(ratio, ratio);

        var data = signaturePad.toDataURL(); //Added


        // canvas.width = canvas.offsetWidth * ratio;
        // canvas.height = canvas.offsetHeight * ratio;
        // canvas.width = $('.board-outline').width() * ratio;
        // canvas.height = $('.board-outline').height() * ratio;
        canvas.width = $('.board-outline').width();
        canvas.height = $('.board-outline').height();
    
        // signaturePad.fromDataURL(data); //Added

        var image = new Image();
        image.src = data;
        image.onload = function () {
            canvas.getContext("2d").drawImage(image, 0, 0);
        }
    }

    // window.onresize = resizeCanvas;
    // resizeCanvas();
    $('.board-outline').on( "resizestop", function( event, ui ) {
        resizeCanvas();
    } );

    $('.board-outline').on( "initboard", function( event, ui ) {
        resizeCanvas();
    } );

    document.getElementById('save-png').addEventListener('click', function () {
    if (signaturePad.isEmpty()) {
        return alert("Please provide a signature first.");
    }
    
    var data = signaturePad.toDataURL('image/png');
    console.log(data);
    window.open(data);
    });

    document.getElementById('save-jpeg').addEventListener('click', function () {
    if (signaturePad.isEmpty()) {
        return alert("Please provide a signature first.");
    }

    var data = signaturePad.toDataURL('image/jpeg');
    console.log(data);
    window.open(data);
    });

    document.getElementById('save-svg').addEventListener('click', function () {
    // if (signaturePad.isEmpty()) {
    //     return alert("Please provide a signature first.");
    // }

    var data = signaturePad.toDataURL('image/svg+xml');
    console.log(data);
    console.log(atob(data.split(',')[1]));
    window.open(data);
    });

    document.getElementById('clear').addEventListener('click', function () {
    signaturePad.clear();
    });

    document.getElementById('undo').addEventListener('click', function () {
        var data = signaturePad.toData();
    if (data) {
        data.pop(); // remove the last dot or line
        signaturePad.fromData(data);
    }
    });

    $("#pen").click( function() {
        //toggle state        
        var ison = $('#pen').attr('data-ison');
        if (ison == 'true')
        {
            ison = 'false';
            signaturePad.off();
            //$('#signature-pad').css("z-index", 1);
            $('.draggable').css('pointer-events', 'auto');
            $('.draggable').css('opacity', '1.0');
        }
        else
        {
            ison = 'true';
            signaturePad.on();
            //$('#signature-pad').css("z-index", 9999);
            $('.draggable').css('pointer-events', 'none');
            $('.draggable').css('opacity', '0.55');
        }

        $('#pen').attr('data-ison', ison);

    });

    signaturePad.off();
    $('#pen').attr('data-ison', false);

    

});
