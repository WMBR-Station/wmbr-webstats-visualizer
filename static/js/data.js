var Observer = function(){
    this.init = function(){
        this.listeners = {};
        this.events = [];
    }
    this.add_event = function(name){
        this.listeners[name] = [];
        this.events.push(name);
    }
    this.listen= function(evt,cbk){
        this.listeners[evt].push(cbk);
    }
    this.unregister = function(evt,cbk){
        this.listeners[evt].remove(cbk);
    }
    this.trigger = function(name,evt){
        for(listener in this.listeners[name]){
            listener(evt);
        }
    }
    this.init();
}

var Segment = function(listener,start,end){
    this.init = function(listener,start,end){
	this.start = start;
	this.end = end;
    }
    this.init(listener,start,end);
}

var Listener = function(ip,dns){
    this.init = function(ip,dns){
              this.ip = ip;
              this.dns = dns;
      	      this.segments = [];
              this.range = {};
              this.range.min = null;
              this.range.max = null;

    }
    
    this.equals = function(ip,dns){
        this.dns == dns || this.ip == ip;
    }
    this.add_segment = function(start,end){
	      this.segments.push(new Segment(this,start,end));
        if(this.range.min == null || start < this.range.min){
            this.range.min = start;
        }
        if(this.range.max == null || end > this.range.max){
            this.range.max = end;
        }
    }
    this.get_events = function(day){
        var events = [];
        for(var i=0 ; i < this.segments.length; i++){
            var seg = this.segments[i];
            if(moment(seg.start).isSame(moment(day),'day') ||
               moment(seg.end).isSame(moment(day),'day')){
                events.push(seg);
            }
        }
        return events;
    }
    this.init(ip,dns);
}

var Listeners = function(){
	this.init = function(){
		  this.listeners = {};
      this.range = {};
  }
  this.get_time_range = function(){
      return this.range;
  }
	this.get = function(ip,dns){
	  if(dns != undefined){
		    if(! (dns in this.listeners)){
			      this.listeners[dns] = new Listener(ip,dns);
		    }
		    return this.listeners[dns];
	   }
	   else {
		     if(j (ip in this.listeners)){
			       this.listeners[ip] = new Listener(ip,dns);
		     }
		     return this.listeners[ip];
	   }
	   
	}
    this.get_listeners = function(){
        return this.listeners;
    }

	this.init();
}
// a show
var Show = function(name,day,start_hour,start_minute,end_hour,end_minute){
	this.init = function(){
      this.start = moment({hour:start_hour,minute:start_minute}).day(-day)
      this.end = moment({hour:end_hour,minute:end_minute}).day(-day);
      this.name = name;
	}
	this.init();
}

var Shows = function(){
	this.init = function(){
		this.shows = {};
	}
	  this.add_show = function(name,d,sh,sm,eh,em){
		    this.shows[name] = new Show(name,d,sh,sm,eh,em);
	}
  this.get_shows = function(){
    return this.shows;
  }
	this.init();
}

var Model = function(){
    this.init = function(){
    	  this.listeners = new Listeners();        
	      this.shows = new Shows();
        this.range = {};
        this.range.min = null;
        this.range.max = null;
    }

    this.add_show = function(name,day,sh,sm,eh,em){
	      this.shows.add_show(name,day,sh,sm,eh,em);
    }

    this.add_event = function(ip,dns,start,end){
	      this.listeners.get(ip,dns).add_segment(start,end);
        if(this.range.min == null || start < this.range.min){
            this.range.min = start;
        }
        if(this.range.max == null || end > this.range.max){
            this.range.max = end;
        }
    }
    this.get_range = function(){
        return this.range;
    }
    this.get_shows = function(day){
        var shows = this.shows.get_shows();
        var data = {};
        console.log("---- searching for shows----- ",day)
        for(show_id in shows){
            var show =  shows[show_id];
            console.log("testing",show_id,show.start.day(),moment(day).day());
            if( (show.start.day() == moment(day).day())                
                || (show.end.day() == moment(day).day()))
            {
                console.log("found same-day show");
                var new_start = new Date(day)
                var new_end = new Date(day)
                new_start.setHours(show.start.hour())
                new_start.setMinutes(show.start.minute());
                new_end.setHours(show.end.hour())
                new_end.setMinutes(show.end.minute());

                data[show_id] = {start:new_start,end:new_end};
            }
        }
        return data;

    }
    this.get_events = function(day){
        var events = {};
        var listeners = this.listeners.get_listeners();
        for (listener_id in listeners){
            var listener = listeners[listener_id];
            var listener_events = listener.get_events(day);

            if(listener_events.length == 0) continue;
            events[listener_id] = {listener:listener,events:[]}

            for(var i=0; i < listener_events.length; i++){
                var event = listener_events[i];
                events[listener_id].events.push(event)
            }
        }
        return events;
    }
    this.init();
}

var DAY = {
    Monday : 1,
    Tuesday : 2,
    Wednesday : 3,
    Thursday : 4,
    Friday : 5,
    Saturday : 6,
    Sunday : 7
}
function random_date(start, end, startHour, endHour) {
    var date = new Date(+start + Math.random() * (end - start));
    var hour = startHour + Math.random() * (endHour - startHour) | 0;
    date.setHours(hour);
    return date;

}
var random_int = function(max){
    return Math.floor(Math.random()*max)
}
var create_dummy_model = function(){
    var model  = new Model();
    model.add_show("test1",7,9,0,10,0)
    model.add_show("test2",3,12,0,13,0)
    var listeners = [
        {ip:"127.0.0.1",dns:'me'},{ip:"86.7.8.32",dns:'bob.comcast.com'}]
    for(var i=0; i <50; i++){
        listeners.push({ip:"xx.xx.xx.xx",dns:"listener"+i+".comcast.com"});
    }
    var begin_date = new Date("09/28/2017");
    var end_date = new Date("10/15/2017");
    var begin_hour = 6;
    var end_hour = 18;
    for(var i=0; i < 1000 ;i++){
        var user = listeners[random_int(listeners.length)];
        var duration = random_int(120)+5;
        var start_time = random_date(begin_date,end_date,begin_hour,end_hour)
        var end_time = new Date(start_time.getTime())

        end_time.setMinutes(start_time.getMinutes() + duration)
        model.add_event(user.ip,user.dns,start_time,end_time)
    }
    return model;
    
}

