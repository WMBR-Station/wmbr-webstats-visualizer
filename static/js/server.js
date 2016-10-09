var WMBRServer = function(){
	//duration is in hours
	this.request = function(date,duration,cbk){
		$.ajax("/api",{
			data: {
				month : date.getMonth(),
				year : date.getFullYear(),
				day : date.getDay(),
				hour: date.getHours(),
				minute: date.getMinutes(),
				duration: duration
			},
			success:function(data){
          cbk(data);
			},
			error:function(err){
				console.log("ERROR",err)
			}
		})
	}

}


var DummyServer = function(){
    this.request = function(date,duration,cbk){
                 var listeners = [];
                 cbk(listeners)
    }
}