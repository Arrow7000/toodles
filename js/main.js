var itemHTML;

// Gets item HTML and stores in item variable
$.get('components/item.html', function(data) {
	itemHTML = data;
});



$(document).ready(function() {

	$(document).on('tap', '.item-tick', function(e) {
		$(this).parent().toggleClass('ticked');
	});

	$(document).on('tap', '.item-del', function(e) {
		$(this).parent().toggleClass('deleted');
	});


	// What happens when the user types (or removes text) from a field
	$(document).on('keyup', '.item-label', function(e) {
		typeEvent(this);
	});
	$(document).on('keydown', '.item-label', function(e) {
		// User presses Enter
		if (e.which == 13 || e.which == 10) {
			e.preventDefault();
			focusNext($(this).parent());
		}
		// All other typing events
		typeEvent(this);
	});







	// NodeJS & Socket.io experiments
	var server = io.connect(window.location.href);
	server.on('messages', function(data) {
		alert(data.hello);
	});

	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		if (content.length > 0) {
			console.log('Saving item: "' + content + '"...');
			server.emit('save', {
				text: content
			});
		}

	});

	server.on('saved', function(data) {
		console.log('Save of "' + data.text + '" successful!');
	});






});




///// Functions

// What happens every time user presses a key (should be invoked above)
function typeEvent(that) {
	var parent = $(that).parent();
	if ($(that).text().length <= 0) {
		// what happens when field doesn't have text in it
		parent.addClass('empty');
		if (!parent.is('.item:last-child')) {
			focusNext(parent);
			parent.remove();
		}
	} else {
		// what happens when field has text in it
		$(that).parent().removeClass('empty');
		if (parent.data('last')) {
			parent.data('last', false);
			$('#item-container').append(itemHTML);

		}
	}
}

// Move focus to next field
function focusNext(that) {
	that.next().find('.item-label').focus();
}
