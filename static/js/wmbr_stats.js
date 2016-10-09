
//protocol.request(new Date("August 29, 2016 10:00:00"),2);
var view;

$(document).ready(function(){
    var model = create_dummy_model();
	  view = new Visualizer("#viz",model);

});
