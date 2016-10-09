var TextSelector = function(model,el,scope){
    this.init = function(model,el,scope){
        this.root = $(el);
        this.root.html("");
        this.before_segs = [];
        this.after_segs = [];
        var frac = Math.round(100/(2*scope+1))+"%";
        var segment = $("<div>").addClass("fill-width text-selector-choice")
                .css("height",frac);
        for(i=0; i < scope; i++){
            this.before_segs.push(segment.clone());
            this.after_segs.push(segment.clone());
        }
        this.current_seg = segment.clone().addClass("text-selector-cursor");


        this.data = null;
        this.data_cursor = null;
        for(seg_id in this.before_segs){
            this.root.append(this.before_segs[seg_id]);
        }
        this.root.append(this.current_seg);
        for(seg_id in this.after_segs){
            this.root.append(this.after_segs[seg_id]);
        }

        var that = this;
        this.root.scroll(function(evt){
            console.log(evt);
        })
        this.model = model;
        this.model.obs.listen('update',function(){
            that.update();
        })
        this.update();
    }

    this.update = function(){
        this.select(this.model.get_selection());
    }
    this.select = function(cursor){
        var data = this.model.get_data();
        var idx = -1;
        for(var i=0; i < data.length; i++){
            var el = data[i];
            if(el == cursor){
                idx = i;
            }
            console.log(el,cursor)
        }
        console.log(cursor,idx);
        if(idx < 0) return;
        this.index = idx;
        var d = data[idx];
        this.current_seg.html(this.model.to_str(d));

        for(var i=0; i < this.before_segs.length; i+=1){
            var el =  this.before_segs[this.before_segs.length - i - 1]
            if(idx-i-1 >= 0){
                var d = data[idx-i-1]
                el.html(this.model.to_str(d));
            }
        }

        for(var i=0; i < this.after_segs.length; i+=1){
            var el = this.after_segs[i];
            if(idx+i+1 < data.length){
                var d = data[idx+i+1];
                el.html(this.model.to_str(d));
            }
            else{
                el.html("");
            }
        }

    }
    this.init(model, el,scope);

}

var Scheduler = function(ntracks){
    this.init = function(){
        this.tracks = [];
        this.viewers = {};
        this.start= null;
        this.end = null;
        this.time = [];
    }
    this.new_track = function(viewer){
        var track = {
            events: []
        }
        this.tracks.push(track);
        this.viewers[viewer] = this.tracks.length-1;
        return this.tracks.length-1;
    }
    this.add_events = function(viewer,evts){
        var track_no = -1;
        for(var i=0; i < this.tracks.length; i++){
            var track_evts = this.tracks[i].events;
            var conflicts = evts.filter(function(evt){
                var conflicting = track_evts.filter(function(e){
                    return !((evt.start > e.end) || (evt.end < e.start)) 
                })
                return conflicting.length > 0
            })
            if(conflicts.length == 0){
                track_no = i;
                break;
            }
        }
        console.log("Existing Track Results",track_no)
        if(track_no == -1){
            track_no = this.new_track(viewer);
        }
        else{
            this.viewers[viewer] = track_no;
        }
        console.log(track_no,this.tracks);
        for(var i=0; i < evts.length; i++){
            this.tracks[track_no].events.push(evts[i]);
            if(this.start == null || evts[i].start < this.start){
                this.start = evts[i].start;
            }
            if(this.end == null || evts[i].end > this.end){
                this.end = evts[i].end;
            }
            this.time.push({time:evts[i].start,delta:1});
            this.time.push({time:evts[i].end,delta:-1});
        }
        this.time.sort(function(b,a){
            return b.time - a.time;
        });

    }
    this.histogram = function(){
        var nlisteners = 0;
        var max = 0;
        for(var i=0; i < this.time.length; i++){
            nlisteners += this.time[i].delta
            this.time[i].n = nlisteners;
            if(nlisteners > max){
                max = nlisteners;
            }
        }
        return {hist:this.time,n:max};
    }
    this.clear = function(){
        this.init();
    }
    this.n_tracks = function(e){
        return this.tracks.length;
    }
    this.get_track = function(lid){
        return this.viewers[lid]
    }
    this.init();
}





var RandomColor = function(){
    var golden_ratio_conjugate = 0.618033988749895;
    var h = Math.random();

    var hslToRgb = function (h, s, l){
        var r, g, b;

        if(s == 0){
            r = g = b = l; // achromatic
                  
        }else{
            function hue2rgb(p, q, t){
                if(t < 0) t += 1;
                if(t > 1) t -= 1;
                if(t < 1/6) return p + (q - p) * 6 * t;
                if(t < 1/2) return q;
                if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
                          
            }

            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
                  
        }

        return '#'+Math.round(r * 255).toString(16)+Math.round(g * 255).toString(16)+Math.round(b * 255).toString(16);
          
    };

    return function(){
        h += golden_ratio_conjugate;
        h %= 1;
        return hslToRgb(h, 0.5, 0.60);
          
    };

};

var random_color = RandomColor();





var ListenerPlot = function(model,root){
    this.init = function(model,root){
        this.scheduler = new Scheduler();

        this.margin = {};
        this.margin.left = 50;
        this.margin.right = 10;
        this.margin.top = 10;
        this.margin.bottom =50;

        var width = root.width()-this.margin.left - this.margin.right;
        var height = root.height()-2*this.margin.top-2*this.margin.bottom;
        var nav_width = width
        var nav_height = height/8
        height -= nav_height

        root.attr("id","listener-plot-div")
        this.plot = d3.select('#listener-plot-div').classed('chart',true)
            .append('svg')
            .attr('width',width + this.margin.left + this.margin.right)
            .attr('height',height + this.margin.bottom + this.margin.top)
            .append('g')
            .attr('transform','translate('+this.margin.left+","+this.margin.top+")")

        this.xscale = d3.time.scale()
            .domain([0,24])
            .range([0,width])

       this.yscale = d3.scale.linear()
           .domain([0,10]).nice()
           .range([height,0])

        //define clipping plane
        var viewport_width = width/5;
        var viewport_height = height;

        this.viewport = this.plot.append('g').attr('clip-path',"url(#plotAreaClip)")

        this.viewport_clip = this.viewport
            .append('clipPath')
            .attr('id','plotAreaClip')
            .append('rect')
            .attr('width',width)
            .attr('height',height)
            .attr('x',0).attr('y',0)

        var that = this;
        this.xaxis = d3.svg.axis()
                .scale(this.xscale)
                .orient('bottom')
            .ticks(10)


        this.yaxis = d3.svg.axis()
                .scale(this.yscale)
                .orient('left')

        this.plot.append('g').attr('class','x axis')
              .attr('transform','translate(0,'+height+')')
            .call(this.xaxis)

        this.plot.append('g').attr('class','y axis')
            .call(this.yaxis)
        /*
         ==== Lower Chart ====
         */
        this.nav = {};
        this.nav.plot = d3.select('#listener-plot-div').classed('chart',true)
            .append('svg')
            .classed('navigator',true)
            .attr('width',nav_width + this.margin.left + this.margin.right)
            .attr('height',nav_height + this.margin.top + this.margin.bottom)
            .append('g')
            .attr('transform','translate('+this.margin.left+","+this.margin.top+')')

        //x axis
        this.nav.xscale = d3.time.scale()
            .domain([0,24])
            .range([0,nav_width])

        this.nav.yscale = d3.scale.linear()
            .domain([0,10])
            .range([nav_height,0]);

        this.nav.xaxis= d3.svg.axis().scale(this.nav.xscale).orient('bottom')

        this.nav.plot.append('g').attr('class','x axis')
            .attr('transform','translate(0,'+nav_height+')')
            .call(this.nav.xaxis);

        //viewport
        this.nav.viewport = d3.svg.brush().x(this.nav.xscale).on("brush",function(){
            that.xscale.domain(that.nav.viewport.empty() ? that.nav.xscale.domain() : that.nav.viewport.extent())
            that.redraw_chart();
        })

        this.nav.plot.append('g').attr('class','viewport').call(this.nav.viewport)
            .selectAll("rect").attr("height",nav_height)

        this.model = model;
        this.model.obs.listen('update',function(){
            that.reload_chart();
        })
        this.series_colors = {};
        this.reload_chart();
    }

    this.redraw_data = function(){
        var data = this.data;
        var that = this;
        var scheduler = this.scheduler;
        
        for(listener_id in data.events){
            var color = this.series_colors[listener_id]
            var events = data.events[listener_id].events

            this.series[listener_id].selectAll('rect').remove()
            this.series[listener_id].selectAll('rect')
              .data(events)
              .enter()
              .append("rect")
              .attr('x',function(d,i){return that.xscale(d.start)})
              .attr('width',function(d,i){return that.xscale(d.end)-that.xscale(d.start)})
              .attr('y',(function(lid){
                  return function(d,i){ return that.yscale(scheduler.get_track(lid)+0.25) }
              })(listener_id))
              .attr('height',(function(lid){
                  return function(d,i){
                      return that.yscale(scheduler.get_track(lid)-0.25) - that.yscale(scheduler.get_track(lid)+0.25)
                  }
              })(listener_id))
              .attr('fill',color)
        }
        console.log(data.shows)
        for(show_id in data.shows){
            var show = [data.shows[show_id]];
            console.log(scheduler.n_tracks())
            this.series[show_id].selectAll('rect').remove()
            this.series[show_id].selectAll('rect')
                .data(show).enter()
                .append("rect")
                .attr("x",function(d){return that.xscale(d.start)})
                .attr("y",function(d){return 0})
                .attr("width",function(d){return that.xscale(d.end) - that.xscale(d.start)})
                .attr("height",function(d){return that.yscale(-0.5)})
                .attr('fill','red')
                .attr('opacity',0.3)

        }
    }
    this.reload_chart = function(){
        var data = this.model.get_data();
        var scheduler = this.scheduler;
        scheduler.clear();
        this.data = data;
        //update schedulre
        for(listener_id in data.events){
            var listener = data.events[listener_id];
            scheduler.add_events(listener_id,listener.events)
        }
        console.log(scheduler.start,scheduler.end)

        this.yscale.domain([-0.5,scheduler.n_tracks()+0.5]);
        this.plot.select(".y.axis").call(this.yaxis)

        this.xscale.domain([scheduler.start,scheduler.end])
        this.plot.select('.x.axis').call(this.xaxis);

        this.nav.xscale.domain([scheduler.start,scheduler.end])
        this.nav.plot.select('.x.axis').call(this.nav.xaxis);

        //create series
        var that = this;
        this.series = {};
        for(listener_id in data.events){
            if(!(listener_id in this.series_colors)){
                this.series_colors[listener_id] = random_color();
            }
            var listener = data.events[listener_id];

            this.series[listener_id] = this.viewport.append('g').attr('class',listener_id)

        }
        for(show_id in data.shows){
            this.series[show_id] = this.viewport.append('g').attr('class',show_id)
        }

        this.redraw_data();

        
        var nav_data = scheduler.histogram();
        var hist = nav_data.hist;
        var n = nav_data.n;
        this.nav.yscale.domain([0,n+0.5]);
        var hist_area = d3.svg.area()
                .x(function(d){return that.nav.xscale(d.time) })
                .y0(function(d){return that.nav.yscale(0) })
                .y1(function(d){return that.nav.yscale(d.n) })
                .interpolate('step-before')

        this.nav.plot.selectAll('area')
            .data(hist)
            .enter()
            .append('path')
            .attr("class","summary")
            .attr('fill','#2980b9')
            .attr("d",hist_area(hist))

    }
    this.redraw_chart= function(){
        // dataseries.call(series)
        var that = this;
        this.plot.select('.x.axis').call(this.xaxis)
        this.redraw_data();
    }
    this.set_time = function(start_time){
        this.window.start_time = start_time - this.offset;
        this.window.end_time = start_time + this.scale + this.offset;
        //update the range we are viewing
        console.log("update window range");
    }
    this.set_date = function(date){
        this.date = date;
        console.log("clear and update dataset")
        
    }
    this.graph = function(){
       

    }

    this.init(model,root);

}

var DateSelectionModel = function(model){
    this.init = function(){
        this.model  =model;
        var range = this.model.get_range();
        this.weeks = {};
        
        for(var day=new Date(range.min);day <= range.max; day.setDate(day.getDate()+1)){
            var start_day = new Date(day).setDate(day.getDate() - day.getDay());
            var end_day = new Date(day).setDate(day.getDate() + (6-day.getDay()));
            var week = {days:[],start_date:start_day,end_date:end_day};
            var week_key = start_day;
            if(! (week_key in this.weeks)){
                this.weeks[week_key] = week;
            }
            this.weeks[week_key].days.push(new Date(day))
        }
        this.cursor = {week:null,day:null};
        this.cursor.week = this.weeks[week_key];
        this.cursor.day = this.cursor.week.days[0];
        this.obs=  new Observer();
        this.obs.add_event("change-day");
        this.obs.add_event("change-week");

        this.obs.trigger("change-day");
    }
    this.select_week = function(sel_week){
        this.cursor.week = sel_week;

        var old_day = this.cursor.day;
        var curr_week = this.weeks[this.cursor.week.start_date]
        var curr_day = this.weeks[this.cursor.week.start_date].days[0]
        for(var i=0; i < curr_week.days.length; i++){
            var day = curr_week.days[i];
            if(day.getDay() == old_day.getDay()){
                curr_day = day;
                break;
            }
        }
        this.cursor.day = curr_day;
        this.obs.trigger("change-week",this.cursor.week)
        this.obs.trigger("change-day",this.cursor.day)
    }
    this.get_days_in_week = function(){
        return this.weeks[this.cursor.week.start_date].days
    }
    this.get_weeks = function(){
        var weeks = [];
        for(start_day in this.weeks){
            weeks.push(this.weeks[start_day]);
        }
        return weeks;
    }
    this.select_day = function(day){
        this.cursor.day = day;
        this.obs.trigger("change-day",this.cursor.day);
    }
    this.get_day = function(){
        return this.cursor.day;
    }
    this.init();
}
var Visualizer = function(root,model){
    this.init = function(root,model){
    	  this.root_id = root;
        this.date_model = new DateSelectionModel(model);
        var that = this;
        //choose day
        this.week_chooser = new TextSelector(new (function(){
            this.get_data = function(){
                return that.date_model.get_weeks();
            }
            this.get_selection = function(){
                return that.date_model.cursor.week;
            }
            this.select = function(d){
                return that.date_model.select_week(d);
            }
            this.to_str = function(d){
                return moment(d.start_date).format('MMM Do')+"-"+moment(d.end_date).format('MMM Do');
            }
            this.obs = new Observer();
            this.obs.add_event("update");
            var inner_that = this;
            that.date_model.obs.listen('change-week',function(){inner_that.obs.trigger('update',inner_that)})
        })(),$(".week-picker",$(root)),2);

        //choose day
        this.day_chooser = new TextSelector(new (function(){
            this.get_data = function(){
                return that.date_model.get_days_in_week();
            }
            this.get_selection = function(){
                return that.date_model.cursor.day;
            }
            this.select = function(d){
                return that.date_model.select_day(d);
            }
            this.to_str = function(d){
                return moment(d).format('dddd, MMM Do');
            }
            this.obs = new Observer();
            this.obs.add_event("update");
            var inner_that = this;
            that.date_model.obs.listen('change-day',function(){inner_that.obs.trigger('update',inner_that)})
        })() ,$(".day-picker",$(root)),2);

        this.model = model;
        this.listener_plot = new ListenerPlot(new (function(){
            this.get_data =function(){
                var day = that.date_model.get_day();
                var segs = that.model.get_events(day);
                var shows = that.model.get_shows(day);
                return {events:segs,shows:shows};
            }

            this.obs = new Observer();
            this.obs.add_event('update');
            var inner_that = this;
            that.date_model.obs.listen('change-day',
                                       function(){inner_that.obs.trigger('update',inner_that)})
        })(),$(".viewport-listeners",$(this.root_id)));



    }

    this.init(root,model);
}
