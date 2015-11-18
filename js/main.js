var typeCount = 0,
	dbOpenItems = [],
	dbCompletedItems = [];

// Empty object
var emptyItem = {
	title: ""
};

// Handlebars functions
// var itemHTML = $("#item-template").html();
// var template = Handlebars.compile(itemHTML);

var itemTemplate = '<div class="item new" data-item-stored="false"><div class="item-section item-del"><i class="fa fa-times"></i></div><div class="item-section item-label"></div><div class="item-section item-tick"><i class="fa fa-check"></i></div>';



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
				newItemAppear(itemContainer, true, true, dbOpenItems[i].title, dbOpenItems[i]._id);
			}
			// Renders new item field as empty
			newItemAppear(itemContainer, true, true);


			// renders *completed* items list to page
			for (var i = 0; i < dbCompletedItems.length; i++) {
				newItemAppear(completedItemContainer, true, false, dbCompletedItems[i].title, dbCompletedItems[i]._id);
			}


		});
	});








	// Disconnect event
	server.on('disconnect', function(client) {
		console.log('Disconnected');
		$('#connection-status').removeClass().addClass('connected').text('Trying to connect...');
		// Makes items uneditable
		itemContainer.find('.item>.item-label').attr('contenteditable', 'false');
	});

	var constantCheck;
	// Event save event - on field focus
	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();
		// constantCheck = setInterval(function() {
			if ($(this).text().length > 0) {
				if (item.attr('data-item-stored') === "true") {
					// Item edit event
					itemEdit(this);
				} else {
					// Item save event
					newItemSave(this);
				}
			}
		// }, 500);
	});

	// $(document).on('blur', '.item-label', function(e) {
	// 	clearInterval(constantCheck);
	// });


	////// Server 'callbacks' to events

	// Feedback from server that item save is successful
	server.on('newItemSaved', function(data) {
		console.log('Save of "' + data.title + '" successful!');

		// Checks for matching item label (cos there's no other way to link the saved item to its response from the server, as they're separate events)
		var matched = false;
		for (var i = itemContainer.children().length - 1; i >= 1; i--) {
			var item = itemContainer.find('>:nth-child(' + i + ')');
			// console.log("Loop run: ", i);
			// Checks matching item and makes 
			if (data.title === item.find('.item-label').text()) {
				matched = true;
				console.log(data._id);
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
	// server.on('itemTicked', function(data) {
	// 	console.log("Item ticked: ", data);
	// });



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

	// Events for all keys other than Enter (both types) and Tab
	$(document).on('keyup', '.item-label', function(e) {
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
		if ($(that).text().length = 0) {
			// console.log('No text');
			// what happens when field doesn't have text in it
			parent.addClass('empty');
			if (parent.is(':last-child')) {
				parent.attr('data-item-stored', 'false');
			} else if (parent.next().is(':last-child')) {
				// console.log('is new item (no text)');
				// If this is the last item before the newly generated empty field
				parent.next().addClass('new').remove();
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
				newItemAppear(itemContainer, true, true)
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
		var id = item.attr('data-item-id');
		var title = item.find('.item-label').text();
		console.log("Ticking item ", id, title);
		// item.toggleClass('ticked');
		server.emit('itemTick', {
			_id: id,
			title: title
		});

		server.on('itemTicked', function(data) {
			itemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]').addClass('ticked');
			console.log("Item ticked: ", data);
		});
	}

	function itemDelete(that) {
		var content = $(that).text();
		var item = $(that).parent();
		item.addClass('deleted');
		server.emit('itemDelete', {
			_id: item.attr('data-item-id'),
			title: item.find('.item-label').text()
		});
	}

	// Makes item contenteditable
	function makeEditable(item, bool) {
		item.find('.item-label').attr('contenteditable', bool);
	}

	// Make new item field appear
	function newItemAppear(parent, editable, normalOrder, itemTitle, itemID) {
		var newItem = $(itemTemplate);
		itemTitle ? newItem.attr('data-item-id', itemID).attr('data-item-stored', "true").find('.item-label').text(itemTitle) : newItem.addClass('empty');
		makeEditable(newItem, editable);
		normalOrder ? parent.append(newItem) : parent.prepend(newItem);
		setTimeout(function() {
			// parent.find('div.item').filter('[data-item-id="' + itemID + '"]').removeClass('new');
			parent.find('.item').removeClass('new');
		}, 10);
	}



	// Changes the text in a field
	function message(field, text) {
		field.text('text');
	}

	function temporaryMessage(field, text, duration) {
		var currText = field.text();
		message(field, text);
		setTimeout(message(field, currText), duration);
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
