package main

import (
	"encoding/json"
	"fmt"
	"github.com/PuerkitoBio/goquery"
	"github.com/gorilla/mux"
	"log"
	"net"
	"net/http"
	net_url "net/url"
	"strconv"
	"strings"
	"time"
)

var session_id="8a8feac639997b649286ffd0bb92c321"
var session_login="sachour@mit.edu"
type show_query struct {
	month    int
	day      int
	year     int
	hour     int
	minute   int
	duration int
}

func query_to_int(query net_url.Values, key string) int {
	if vl, ok := query[key]; ok {
		if i, err := strconv.Atoi(vl[0]); err == nil {
			return i
		} else {
			log.Fatal(err)
		}

	} else {
		log.Fatal(key + " is not in query string.")
	}
	return -1
}

func dict_to_show_query(query net_url.Values) show_query {
	return show_query{
		month:    query_to_int(query, "month"),
		day:      query_to_int(query, "day"),
		year:     query_to_int(query, "year"),
		hour:     query_to_int(query, "hour"),
		minute:   query_to_int(query, "minute"),
		duration: query_to_int(query, "duration")}

}

type listener struct {
	StartTime time.Time     `json:"start_time"`
	EndTime   time.Time     `json:"end_time"`
	Duration  time.Duration `json:"duration"`
	IpAddr    net.IP        `json:"ip_addr"`
	DnsAddr   *net_url.URL  `json:"dns_addr"`
}

func map_to_listener(query map[string]string) *listener {
	if _, ok := query["start_time"]; !ok {
		return nil
	}
	var ref_str = "Mon, Jan 2, 2006 15:04:05"
	if start_time, err := time.Parse(ref_str, query["start_time"]); err == nil {
		segs := strings.Split(query["duration"], ":")
		var duration_str = strings.TrimSpace(segs[0]) + "h" +
			strings.TrimSpace(segs[1]) + "m" + strings.TrimSpace(segs[2]) + "s"
		if duration, err := time.ParseDuration(duration_str); err == nil {
			end_time := start_time.Add(duration)
			ip_addr := net.ParseIP(query["ip_addr"])

			if query["dns_addr"] == "unknown" {
				var listener = listener{StartTime: start_time, EndTime: end_time,
					Duration: duration, IpAddr: ip_addr, DnsAddr: nil}
				return &listener
			}
			if dns_addr, err := net_url.Parse(query["dns_addr"]); err == nil {
				var listener = listener{StartTime: start_time, EndTime: end_time,
					Duration: duration, IpAddr: ip_addr, DnsAddr: dns_addr}
				return &listener
			} else {
				log.Fatal(err)
			}
		} else {
			log.Fatal(err)
		}

	} else {
		log.Fatal(err)
	}
	return nil
}

// Converting query
func make_month_map() map[int]string {
	var month_map map[int]string = make(map[int]string)
	month_map[1] = "Jan"
	month_map[2] = "Feb"
	month_map[3] = "Mar"
	month_map[4] = "Apr"
	month_map[5] = "May"
	month_map[6] = "Jun"
	month_map[7] = "Jul"
	month_map[8] = "Aug"
	month_map[9] = "Sep"
	month_map[10] = "Oct"
	month_map[11] = "Nov"
	month_map[12] = "Dec"
	return month_map

}
func show_query_to_wmbr_query_string(query show_query) *http.Request {
	if req, error := http.NewRequest("GET", "http://wmbr.org/cgi-bin/streamlog", nil); error == nil {
		nquery := make(net_url.Values)
		month_map := make_month_map()
		nquery.Set("mon", month_map[query.month])
		nquery.Set("day", strconv.Itoa(query.day))
		nquery.Set("year", strconv.Itoa(query.year))
		nquery.Set("hour", strconv.Itoa(query.hour))
		nquery.Set("min", strconv.Itoa(query.minute))
		nquery.Set("len", strconv.Itoa(query.duration))
		req.URL.RawQuery = nquery.Encode()
		expiration := time.Now().Add(365 * 24 * time.Hour)
		login_cookie := http.Cookie{Name: "wmbrlogin", Value: session_login, Expires: expiration}
		session_cookie := http.Cookie{Name: "MemberSessionID", Value: session_id, Expires: expiration}
		req.AddCookie(&login_cookie)
		req.AddCookie(&session_cookie)
		log.Printf(req.URL.String())
		return req

	} else {
		log.Fatal(error)

	}
	return nil
}

func extract_json(res *goquery.Document) string {

	var idx_to_keys = make(map[int]string)
	idx_to_keys[0] = "start_time"
	idx_to_keys[1] = "quality"
	idx_to_keys[2] = "duration"
	idx_to_keys[3] = "ip_addr"
	idx_to_keys[4] = "dns_addr"

	table := (*res).Find("table").FilterFunction(func(i int, sel *goquery.Selection) bool {
		if i == 4 {
			return true
		} else {
			return false
		}
	})
	var n = table.Find("tr").Length()
	// data representation of listeners
	var listeners []listener = make([]listener, n)
	log.Printf("<<# rows>>" + strconv.Itoa(n))
	var idx = 0
	table.Find("tr").Each(func(i int, sel *goquery.Selection) {
		var values = make(map[string]string)
		sel.Find("td").Each(func(j int, sel *goquery.Selection) {
			log.Printf(strconv.Itoa(j) + "<<" + sel.Text() + ">>")
			values[idx_to_keys[j]] = sel.Text()
		})
		listener := map_to_listener(values)
		if listener != nil {
			listeners[idx] = *listener
			idx += 1
		}
	})

	if result, err := json.Marshal(listeners); err == nil {
		log.Printf(string(result))
		return string(result)
	} else {
		log.Fatal(err)
	}
	return ""

}
func get_wmbr_response(query show_query) (args string) {
	request := show_query_to_wmbr_query_string(query)
	client := &http.Client{}
	if resp, err := client.Do(request); err == nil {
		if doc, err := goquery.NewDocumentFromResponse(resp); err == nil {
			json := extract_json(doc)
			return json
		} else {
			log.Fatal(err)
		}
	} else {
		log.Fatal(err)
	}
	return "error"
}

func main() {
	router := mux.NewRouter().StrictSlash(false)
	router.PathPrefix("/static").Handler(http.FileServer(http.Dir(".")))
	router.HandleFunc("/api", func(w http.ResponseWriter, r *http.Request) {
		params, err := net_url.ParseQuery(r.URL.RawQuery)
		log.Printf("=== Received API Request ==")
		if err != nil {
			log.Fatal(err)
		}
		request := dict_to_show_query(params)
		resp := get_wmbr_response(request)
		fmt.Fprintf(w, resp)
	})

	log.Fatal(http.ListenAndServe(":8080", router))
}
