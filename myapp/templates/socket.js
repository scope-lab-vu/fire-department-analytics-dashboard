/**
 * Created by wangshibao on 6/29/17.
 */
var socket = io.connect('http://' + document.domain + ':' + location.port);

socket.on('success', function() {
    // socket.emit('my event', {data: 'I\'m connected!'}); // my event = rest api url
    console.log("socketio success");
    socket.emit('get_data');
});

var data_incidents;
socket.on('accident_data', function(msg) {
    console.log(msg);
    data_incidents = msg.data
    

});

function request_data(startDate, endDate) {
	socket.emit("get_data", {
		startDate: startDate, endDate: endDate
	})
}

