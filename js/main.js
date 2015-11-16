var typeCount = 0,
	dbOpenItems = [],
	dbCompletedItems = [];

// Empty object
var emptyItem = {
	title: ""
};

// Handlebars functions
var itemHTML = $("#item-template").html();
var template = Handlebars.compile(itemHTML);





$(document).ready(function() {

	// Variable assignment for speedier DOM element grabbing
	var itemContainer = $("#item-container");
	var completedItemContainer = $("#completed-item-container");






	// Sets server location
	var server = io.connect(window.location.href);

	// Connect event
	server.on('connect', function(client) {
		console.log('Now connected!');
		// Changes status to display 'connected'
		$('#connection-status').removeClass().addClass('connected').text('Connected');

		// Item load event, to happen on connection
		server.on('pageLoadItemLoad', function(dbItems) {

			// Splitting items into open and completed, by filtering
			dbOpenItems = dbItems.list.filter(function(obj) {
				return obj.completed === false;
			});
			dbCompletedItems = dbItems.list.filter(function(obj) {
				return obj.completed === true;
			});



			//// Page initialiser functions

			// Renders all current items to page
			for (var i = 0; i < dbOpenItems.length; i++) {
				itemContainer.append(template(dbOpenItems[i]));
			}
			// renders *completed* items list to page
			for (var i = 0; i < dbCompletedItems.length; i++) {
				completedItemContainer.prepend(template(dbCompletedItems[i]));
			}

			//// Page initialiser secondary functions

			// Renders the last *current* item as empty
			itemContainer.append(template(emptyItem));
			itemContainer.find(':last-child').addClass('empty');

			// Adds item IDs as attributes (IDs taken from MongoDB)
			for (var i = 0; i < itemContainer.find('.item').length - 1; i++) {
				itemContainer.find('.item:nth-child(' + (i + 1) + ')').attr('data-item-id', dbOpenItems[i]['_id']).attr('data-item-stored', "true");
			}

			// Makes items editable
			editable(itemContainer.find('.item'), true);
			// itemContainer.find('.item').find('.item-label').attr('contenteditable', 'true');
			setTimeout(function() {
				itemContainer.find('.item').removeClass('new')
			}, 1);
		});
	});








	// Disconnect event
	server.on('disconnect', function(client) {
		console.log('Disconnected');
		$('#connection-status').removeClass().addClass('connected').text('Trying to connect...');
		// Makes items uneditable
		for (var i = 0; i < itemContainer.find('.item').length; i++) {
			itemContainer.find('.item>.item-label').attr('contenteditable', 'false');
		}
	});


	// Event save event - on field blur
	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();
		if (content.length > 0) {
			if (item.attr('data-item-stored') === "true") {
				// Item edit event
				itemEdit(this);
			} else {
				// Item save event
				newItemSave(this);
			}
		}
	});

	////// Server 'callbacks' to events

	// Feedback from server that item save is successful
	server.on('newItemSaved', function(data) {
		console.log('Save of "' + data.title + '" successful!');
		// console.log(data._id);

		// console.log("Number of items: ", itemContainer.children().length);;

		// Checks for matching item label (cos there's no other way to link the saved item to its response from the server, as they're separate events)
		var matched = false;
		for (var i = itemContainer.children().length - 1; i >= 1; i--) {
			var item = itemContainer.find('>:nth-child(' + i + ')');
			// console.log("Loop run: ", i);
			// Checks matching item and makes 
			if (data.title === item.find('.item-label').text()) {
				matched = true;
				item.attr('data-item-id', data._id);
				item.attr('data-item-stored', "true");
				// console.log("Item " + i + " is a match!");
				break;
			}
		}
		if (matched) {
			// console.log("Found a match for " + data.title);
		} else {
			// console.log("Couldn't find a match for item");
		}
	});
	server.on('itemEdited', function(data) {
		console.log("Item edited", data);
	});
	server.on('itemDeleted', function(data) {
		console.log("Item deleted: ", data.title);
	});
	server.on('itemTicked', function(data) {
		console.log("Item ticked: ", data);
	});



	///// Button tap events

	// Tap 'tick' button
	$(document).on('tap', '.item-tick', function(e) {
		itemTick(this);
	});

	// Tap 'delete' button
	$(document).on('tap', '.item-del', function(e) {
		var item = $(this).parent();
		itemDelete(this);
	});


	///// Typing events

	// Events for all keys other than Enter and Tab
	$(document).on('keyup', '.item-label', function(e) {
		// Does everything apart 
		if ((e.which == 13 || e.which == 10 || e.which == 9) == false) {
			typeEvent(this);
		}
	});

	// Events for Enter and Tab keys
	$(document).on('keydown', '.item-label', function(e) {
		// User presses Enter or Tab
		if (e.which == 13 || e.which == 10) {
			e.preventDefault();
			focusNext($(this).parent());
		} else if (e.which == 9) {}
	});











	///// Functions

	// What happens every time user presses a key (should be invoked above)
	function typeEvent(that) {
		typeCount++;
		// console.log(typeCount);
		var parent = $(that).parent();
		if ($(that).text().length <= 0) {
			// console.log('No text');
			// what happens when field doesn't have text in it
			parent.addClass('empty');
			if (parent.is(':last-child')) {
				parent.attr('data-item-stored', 'false');
			} else if (parent.next().is(':last-child')) {
				// console.log('is new item (no text)');
				// If this is the last item before the newly generated empty field
				parent.next().remove();
			} else {
				// console.log('Is existing item');
				// If this is not the last item in the list
				parent.addClass('deleted');
				focusNext(parent);
			}
		} else {
			// console.log('Has text');
			// what happens when field has text in it
			$(that).parent().removeClass('empty deleted');
			if (parent.is(':last-child')) {
				// console.log('Is new item (has text)');
				itemContainer.append(template(emptyItem));
				parent.addClass('empty');
				console.log("New 'item' added");
				setTimeout(function() {
					itemContainer.find('.item:last-child').removeClass('new').find('.item-label')
				}, 1);
			}
		}
	}

	// Move focus to next field
	function focusNext(that) {
		that.next().find('.item-label').focus();
	}

	// CRUD operations
	function newItemSave(that) {
		var content = $(that).text();
		var item = $(that).parent();
		console.log("Saving new item: ", content);
		server.emit('newItemSave', {
			title: content
		});
	}

	function itemEdit(that) {
		var content = $(that).text();
		var item = $(that).parent();
		server.emit('itemEdit', {
			_id: item.attr('data-item-id'),
			title: content
		});
	}

	function itemTick(that) {
		var content = $(that).text();
		var item = $(that).parent();
		item.toggleClass('ticked');
		server.emit('itemTick', {
			_id: item.attr('data-item-id'),
			title: item.find('.item-label').text()
		});
	}

	function itemDelete(that) {
		var content = $(that).text();
		var item = $(that).parent();
		item.toggleClass('deleted');
		server.emit('itemDelete', {
			_id: item.attr('data-item-id'),
			title: item.find('.item-label').text()
		});
	}
	// Make new item field appear
	function newItemAppear(that) {
		var content = $(that).text();
		var item = $(that).parent();
	}
	
	// Makes item contenteditable
	function editable(item, bool) {
		item.find('.item-label').attr('contenteditable', 'true');
	}


});







/* Actions
To server:
	newItemSave
	itemEdit
	itemTick
	itemDelete

From server to client:
	Action completes:
		newItemSaved
		itemEdited
		itemTicked
		itemDeleted

	pageLoadItemLoad

	Potential multicoop acts:






*/
