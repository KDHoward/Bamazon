var mysql = require("mysql");
var prompt = require("prompt");


var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'Bamazon'
});



var execute = function() {

    connection.query("SELECT * FROM Products", function(err, result) {
        return (prettyTable(result));

    });

    setTimeout(function() {
        prompt.get(['ItemID', 'Quantity'], function(err, result) {
            var shopperItem = result.ItemID;
            var shopperQuantity = result.Quantity;

            inventoryCheck(shopperItem, shopperQuantity);
            setTimeout(function() { execute(); }, 3500);

        });
    }, 750);
}


var inventoryCheck = function(id, quantity) {
    connection.query('SELECT * FROM Products WHERE ItemID = ' + id, function(err, result) {
        if (err) throw err;

        var total = result[0].Price * quantity;

        var inventory = result[0].StockQuantity - quantity;

        if (inventory < 0) {
            console.log('Insufficient stock. There are only ' + result[0].StockQuantity + 'item(s) left.');
        } else {
            console.log('User has bought ' + quantity + ' ' + result[0].ProductName + ' for $' + total);
            console.log('There are ' + inventory + ' ' + result[0].ProductName + ' remaining.')
            databaseUpdate(id, inventory)
        }
    });
}


var databaseUpdate = function(id, quantity) {
    connection.query('update products set StockQuantity = ' + quantity + ' where ItemID = ' + id, function(err, result) {
        if (err) throw err;
    });
}


function prettyTable(items) {
    for (var i = 0; i < items.length; i++) {
        console.log('------------------------');
        console.log('ItemID: ' + items[i].ItemID);
        console.log('Item: ' + items[i].ProductName);
        console.log('Department: ' + items[i].DepartmentName);
        console.log('Price: $' + items[i].Price);
    }
    console.log('------------------------');
}


connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err);
        return;
    }
});


execute();