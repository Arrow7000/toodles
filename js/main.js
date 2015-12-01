var typeCount = 0,
	dbOpenItems = [],
	dbCompletedItems = [],
	model = {
		openItems: [],
		completedItems: [],
		archivedItems: []
	};

// Empty object
var emptyItem = {
	title: ""
};


var itemTemplate = '<div class="item appear" data-item-stored="false"><div class="item-section item-del"><i class="fa fa-times"></i></div><div class="item-section item-label"></div><div class="item-section item-tick"><i class="fa fa-check"></i></div>';



$(document).ready(function() {



	// Variable assignment for speedier DOM element grabbing
	var itemContainer = $("#item-container");
	var completedItemContainer = $("#completed-item-container");
	var archivedItemContainer = $('#archived-item-container');



	// itemContainer.sortable();


	// Sets server location
	var server = io.connect(window.location.href);

	// Connect event
	server.on('connect', function(client) {
		console.log('Now connected!');
		// Changes status to display 'connected'
		$('#connection-status').removeClass().addClass('connected').text('Connected');

		// Synchronise models when connection happens
		server.on('connectionUpdate', function(data) {
			syncModels(model, data);
		});
		console.log(model);

		makeEditable(itemContainer, true);
	});




	// Disconnect event
	server.on('disconnect', function(client) {
		console.log('Disconnected');
		$('#connection-status').removeClass().addClass('connected').text('Trying to connect...');
		// Makes items uneditable
		makeEditable(itemContainer, false);
	});




	// Focus event
	$(document).on('focus', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();
		var tempID = genID();

		item.attr('data-temp-id', tempID);

	});


	// Blur event
	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();
		setTimeout(function() {
			item.removeAttr('data-temp-id');
		}, 500);


		if (item.attr('data-item-stored') === "true") {
			if (content.length > 0) {
				// Item edit event
				itemEdit(item);
			} else {
				// Item save event
				itemDelete(item);
			}
		} else {
			if (content.length > 0) {
				newItemSave(item);
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


	/// Button tap events

	// Tap 'tick' button
	$(document).on('tap', '#item-container .item-tick', function(e) {
		itemTick($(this).parent());
	});

	// Tap 'delete' button
	$(document).on('tap', '#item-container .item-del', function(e) {
		itemDelete($(this).parent());
	});


	/// Completed item list actions

	// Tap 'untick' button when item is completed
	$(document).on('tap', '#completed-item-container .item-tick', function(e) {
		itemUntick($(this).parent());
	});

	// Tap 'archive' button
	$(document).on('tap', '#completed-item-container .item-del', function(e) {
		itemArchive($(this).parent());
	});



	/// Typing events

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



	////// Server 'callbacks' to events

	// Feedback from server that item save is successful
	server.on('newItemSaved', function(data) {
		var item = $(document).find('[data-temp-id="' + data.tempID + '"]');
		// console.log(item);
		if (item.length === 0) {
			newItemAppear(itemContainer, true, true, data.title, data._id);
		} else {
			// var item = itemContainer.find('.item:nth-child(' + (data.index + 1) + ')');
			// item.removeAttr('data-temp-id');
			item.attr('data-item-id', data._id);
			item.attr('data-item-stored', "true");
		}
		console.log('Save of "' + data.title + '" successful!', data);
	});


	server.on('itemEdited', function(data) {
		var item = $(document).find('[data-item-id="' + data._id + '"]');
		var giver = $(document).find('[data-temp-id="' + data.tempID + '"]');
		var label = item.find('.item-label');

		if (giver.length === 0) {
			makeEditable(item, false);
			label.text(data.title);
			console.log("This is receiving");
			setTimeout(function() {
				makeEditable(item, true);
			}, 1000);
		} else {
			// item.removeAttr('data-temp-id');
			console.log("This is giving");
		}
		console.log("Item edited", data);
	});


	server.on('itemTicked', function(data) {
		var tickedItem = $(document).find('div.item').filter('[data-item-id="' + data._id + '"]');
		if (!tickedItem.hasClass('ticked')) {
			makeEditable(tickedItem, false);
			tickedItem.addClass('ticked');
		}
		console.log("Item ticked: ", data);
		setTimeout(function() {
			tickedItem.prependTo(completedItemContainer);
			tickedItem.removeClass('ticked').addClass('appear');
		}, 1000);
	});


	server.on('itemUnticked', function(data) {
		var untickedItem = completedItemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]');
		if (!untickedItem.hasClass('ticked')) {
			untickedItem.addClass('ticked');
		}
		console.log("Item unticked: ", data);
		setTimeout(function() {
			untickedItem.insertBefore(itemContainer.find('.item:last-child'));
			makeEditable(untickedItem, true);
			untickedItem.removeClass('ticked').addClass('appear');
		}, 1000);
	});


	server.on('itemArchived', function(data) {
		var archivedItem = completedItemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]');
		if (!archivedItem.hasClass('deleted')) {
			archivedItem.addClass('deleted');
		}
		console.log("Item archived: ", data);
		setTimeout(function() {
			archivedItem.prependTo(archivedItemContainer);
			archivedItem.removeClass('deleted').addClass('appear');
		}, 1000);
	});


	server.on('itemDeleted', function(data) {
		var item = itemContainer.find('div.item').filter('[data-item-id="' + data._id + '"]');
		if (!item.hasClass('deleted')) {
			item.addClass('deleted');
		}
		console.log("Item deleted: ", data.title);
	});













	///// Functions


	// What happens every time user presses a key (should be invoked above)
	function typeEvent(that) {
		var label = $(that);
		var item = $(that).parent();
		var nextItem = item.next('.item');
		// console.log(caret(label));
		// what happens when field has text in it
		if (label.text().length > 0) {
			item.removeClass('empty');
			itemEdit(item);
			if (item.is(':last-child')) {
				newItemAppear(itemContainer, true, true);
				newItemSave(item);
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

	function syncModels(model1, model2) {
		model1.openItems = model2.openItems;
		model1.completedItems = model2.completedItems;
		model1.archivedItems = model2.archivedItems;

	}

	//////// CRUD operations (actually SETUAD)
	function newItemSave(that) {
		var item = that;
		var content = item.find('.item-label').text();
		// var tempID = genID();
		var tempID = that.attr('data-temp-id');
		// console.log("New item's tempID: " + tempID);

		console.log("Saving new item: ", content);
		server.emit('newItemSave', {
			title: content,
			tempID: tempID,
			index: item.index()
		});
	}

	function itemEdit(that) {
		var item = that;
		var content = item.find('.item-label').text();
		// var tempID = genID();
		// that.attr('data-temp-id', tempID);
		// console.log("Edited item's tempID: " + tempID);

		var tempID = item.attr('data-temp-id');

		server.emit('itemEdit', {
			_id: item.attr('data-item-id'),
			title: content,
			tempID: tempID
		});
	}

	function itemTick(that) {
		var item = that;
		var id = item.attr('data-item-id');
		var title = item.find('.item-label').text();

		if (item.attr('data-item-stored') === "true") {
			server.emit('itemTick', {
				_id: id,
				title: title
			});
			console.log("Ticking item ", id, title);
			makeEditable(item, false);
			item.addClass('ticked');

		}
	}

	function itemUntick(that) {
		var item = that;
		var title = item.find('.item-label').text();

		var id = item.attr('data-item-id');
		console.log("Unticking item ", id, title);
		item.addClass('ticked');
		server.emit('itemUntick', {
			_id: id,
			title: title
		});
	}

	function itemArchive(that) {
		var item = that;
		var content = item.find('.item-label').text();
		item.addClass('deleted');
		server.emit('itemArchive', {
			_id: item.attr('data-item-id'),
			title: item.find('.item-label').text()
		});
	}

	function itemDelete(that) {
		var item = that;
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

	function genID() {
		var string = '';
		var chars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 'a', 'b', 'c', 'd', 'e', 'f'];
		for (var i = 0; i < 8; i++) {
			string += chars[Math.floor(Math.random() * 16)]
		}
		return string;
	}

	function caret(node) {
		//node.focus(); 
		/* without node.focus() IE will returns -1 when focus is not on node */
		if (node.selectionStart) return node.selectionStart;
		else if (!document.selection) return 0;
		var c = "\001";
		var sel = document.selection.createRange();
		var dul = sel.duplicate();
		var len = 0;
		dul.moveToElementText(node);
		sel.text = c;
		len = (dul.text.indexOf(c));
		sel.moveStart('character', -1);
		sel.text = "";
		return len;
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
