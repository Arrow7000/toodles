var typeCount = 0,
	dbItemsArray = [];

// Lists of all the items
var itemsList = [{
	title: "Buy milk",
	ownerID: 12345,
	completed: false
}];
var completedItems = [{
	title: "Be nice to Stew",
	ownerID: 12345,
	completed: false
}, {
	title: "Boil rabbits",
	ownerID: 12345,
	completed: false
}];
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
			dbItemsArray = dbItems.list;
			console.log('dbItemsArray: ', dbItemsArray);


			// Renders all current items to page
			for (var i = 0; i < dbItemsArray.length; i++) {
				itemContainer.append(template(dbItemsArray[i]));
			}
			// Renders the last current item as empty
			itemContainer.append(template(emptyItem));
			itemContainer.find(':last-child').addClass('empty');

			// Populates *completed* items list
			for (var i = 0; i < completedItems.length; i++) {
				completedItemContainer.append(template(completedItems[i]));
				completedItemContainer.find(':last-child').addClass('empty');
				completedItemContainer.find(':last-child>.item-label').attr('contenteditable', 'false');
			}

			// Adds item IDs as attributes (IDs taken from MongoDB)
			for (var i = 0; i < itemContainer.find('.item').length - 1; i++) {
				itemContainer.find('.item:nth-child(' + (i + 1) + ')').attr('data-item-id', dbItemsArray[i]['_id']).attr('data-item-stored', true);

			}

			// Makes items editable
			itemContainer.find('.item').find('.item-label').attr('contenteditable', 'true');


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


	// Blur item field event
	$(document).on('blur', '.item-label', function(e) {
		var content = $(this).text();
		var item = $(this).parent();
		if (content.length > 0) {
			if (item.attr('data-item-stored') === true) {
				console.log('Just editing :3');
			} else {
				console.log("Saving new item: ", content);
				console.log(item.attr('data-item-stored'));

				item.attr('data-item-stored', true);


				// Item save event
				server.emit('newItemSave', {
					title: content
				});
			}

		}

		server.on('newItemSaved', function(data) {
			console.log('Save of "' + data.title + '" successful!');
			item.attr('data-item-id');
		});

	});

	// Feedback from server that item save is successful








	///// Button tap events

	// Tap 'tick' button
	$(document).on('tap', '.item-tick', function(e) {
		$(this).parent().toggleClass('ticked');
	});

	// Tap 'delete' button
	$(document).on('tap', '.item-del', function(e) {
		$(this).parent().toggleClass('deleted');
	});


	/// Typing events

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
				itemContainer.find(':last-child').addClass('empty').find('.item-label').attr('contenteditable', 'true');
			}
		}
	}

	// Move focus to next field
	function focusNext(that) {
		that.next().find('.item-label').focus();
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
