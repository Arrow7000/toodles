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

var itemTemplate = '<div class="item appear" data-item-stored="false" data-item-order="n"><div class="item-section item-del"><i class="fa fa-times"></i></div><div class="item-section item-label"></div><div class="item-section item-tick"><i class="fa fa-check"></i></div>';



$(document).ready(function() {



	// Variable assignment for speedier DOM element grabbing
	var itemContainer = $("#item-container");
	var completedItemContainer = $("#completed-item-container");



	// itemContainer.sortable();


	// Sets server location
	var server = io.connect(window.location.href);

	// Connect event
	server.on('connect', function(client) {
		console.log('Now connected!');
		// Changes status to display 'connected'
		$('#connection-status').removeClass().addClass('connected').text('Connected');

		makeEditable(itemContainer, true);
	});








	// Disconnect event
	server.on('disconnect', function(client) {
		console.log('Disconnected');
		$('#connection-status').removeClass().addClass('connected').text('Trying to connect...');
		// Makes items uneditable
		makeEditable(itemContainer, false);
	});



	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();

		if (item.attr('data-item-stored') === "true") {
			if (content.length > 0) {
				// Item edit event
				itemEdit(this);
			} else {
				// Item save event
				itemDelete(this);
			}
		} else {
			if (content.length > 0) {
				newItemSave(this);
			} else {
				if (item.next().is(':last-child')) {
					item.addClass('empty');
					itemDisappear(item.next());
					setTimeout(function() {
						item.next().remove();
					}, 500);
				}
			}
		}
	});
	/*
		Logic for blur event:

		if: item is stored (d-i-s=true):
			if: has text:
				editEvent
			else (empty):
				deleteEvent
		else (item not stored):
			if: has text:
				newItemSave
			else (empty):
				if: item is second-to-last:
					delete last item
	*/







	////// Server 'callbacks' to events

	// Feedback from server that item save is successful
	server.on('newItemSaved', function(data) {
		console.log('Save of "' + data.title + '" successful!');

		// Checks for matching item label (cos there's no other way to link the saved item to its response from the server, as they're separate events)
		var matched = false;
		for (var i = itemContainer.children().length - 1; i >= 1; i--) {
			var item = itemContainer.find('>:nth-child(' + i + ')');
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
	server.on('coopNewItemSaved', function(data) {
		coopNewItemSaved(itemContainer, data);
	});



	///// Button tap events

	// Tap 'tick' button
	$(document).on('tap', '#item-container .item-tick', function(e) {
		itemTick(this);
	});

	// Tap 'delete' button
	$(document).on('tap', '#item-container .item-del', function(e) {
		itemDelete(this);
	});


	/// Completed item actions

	// Tap 'untick' button when item is completed
	$(document).on('tap', '#completed-item-container .item-tick', function(e) {
		itemUntick(this);
	});

	// Tap 'archive' button
	$(document).on('tap', '#completed-item-container .item-del', function(e) {
		itemArchive(this);
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
		var item = $(that).parent();
		var nextItem = item.next('.item');
		// what happens when field has text in it
		if ($(that).text().length > 0) {
			item.removeClass('empty');
			if (item.is(':last-child')) {
				newItemAppear(itemContainer, true, true)
			}
		} else {
			if (nextItem.is(':last-child')) {
				item.addClass('empty');
				nextItem.removeClass('appear').addClass('disappear');

				setTimeout(function() {
					nextItem.remove();
				}, 500);
			}
		}
	}

	/*	
	Logic for typing in item-labels:

		if: has text:
			class shouldn't contain 'empty'
			if: item is last:
				generate item underneath
		else (is empty): 
			if: item is penultimate:
				add 'empty' class
				remove next item
	*/




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
		if (item.attr('data-item-stored') === "true") {
			console.log("Ticking item ", id, title);
			makeEditable(item, false);
			item.addClass('ticked');
			server.emit('itemTick', {
				_id: id,
				title: title
			});
		}
		// On confirmation from the server
		server.on('itemTicked', function(data) {
			var tickedItem = itemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]');
			// tickedItem.addClass('ticked');
			console.log("Item ticked: ", data);
			setTimeout(function() {
				tickedItem.prependTo(completedItemContainer);
				tickedItem.removeClass('ticked').addClass('appear');
			}, 1000);
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

	// Unticking an item
	function itemUntick(that) {
		var content = $(that).text();
		var item = $(that).parent();
		var id = item.attr('data-item-id');
		var title = item.find('.item-label').text();
		console.log("Unticking item ", id, title);
		item.addClass('ticked');
		server.emit('itemUntick', {
			_id: id,
			title: title
		});
		// On confirmation from the server
		server.on('itemUnticked', function(data) {
			var untickedItem = completedItemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]');
			// untickedItem.addClass('ticked');
			console.log("Item unticked: ", data);
			setTimeout(function() {
				// itemContainer;
				untickedItem.insertBefore(itemContainer.find('.item:last-child'));
				makeEditable(untickedItem, true);
				untickedItem.removeClass('ticked').addClass('appear');
			}, 1000);
		});
	}

	function itemArchive(that) {
		var content = $(that).text();
		var item = $(that).parent();
		item.addClass('deleted');
		server.emit('itemArchive', {
			_id: item.attr('data-item-id'),
			title: item.find('.item-label').text()
		});
		server.on('itemArchived', function(data) {
			console.log("Item archived: ", data);
		});
	}

	function coopNewItemSaved(parent, itemData) {
		newItemAppear(parent, true, true, itemData.title, itemData._id);
	}

	// Makes item contenteditable
	function makeEditable(item, bool) {
		item.find('.item-label').attr('contenteditable', bool);
	}

	// Make new item field appear
	function newItemAppear(parent, editable, normalOrder, itemTitle, itemID) {
		var newItem = $(itemTemplate);
		// Assigns attributes to newItem as necessary. ID, title, etc if existing item, and class of empty if new
		itemTitle ? newItem.attr('data-item-id', itemID).attr('data-item-stored', "true").find('.item-label').text(itemTitle) : newItem.addClass('empty');
		// Makes it editable
		makeEditable(newItem, editable);
		// Determines whether it gets pre-or-ap-pended
		if (normalOrder) {
			if (itemTitle) {
				newItem.insertBefore(itemContainer.find('.item:last-child'));
			} else {
				parent.append(newItem);
			}
			newItem.attr("data-item-order", parent.children().length);
		} else {
			parent.prepend(newItem);
		}
	}

	function itemDisappear(item) {
		item.removeClass('appear').addClass('disappear');
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
	itemUntick
	itemArchive
	itemDelete

From server to client:
	Action completes:
		newItemSaved
		itemEdited
		itemTicked
		itemUnticked
		itemArchived
		itemDeleted

	Potential multicoop acts:
		coopNewItemSaved
		coopItemEdited
		coopItemTicked
		coopItemDeleted




Logic for typing in item-labels:

	if: has text:
		class shouldn't contain 'empty'
		if: item is last:
			generate item underneath
	else (is empty): 
		if: item is last:
			add 'empty' class


Logic for blur event:

if: item is stored (d-i-s=true):
	if: has text:
		editEvent
	else (empty):
		deleteEvent
else (item not stored):
	if: has text:
		newItemSave
	else (empty):
		if: item is second-to-last:
			itemDelete







*/
