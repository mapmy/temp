(function(){
	var app = angular.module('receiveRTC', [],
		function($locationProvider){$locationProvider.html5Mode(true);}
    );
	var client = new PeerManager();
	var mediaConfig = {
        audio:true,
        video: {
			mandatory: {},
			optional: []
        }
    };

    window.onunload = function(){
    	client.close();
    };

    // controller for remote streams
	app.controller('RemoteStreamsController', ['$location', '$http', function($location, $http){
		var rtc = this;
		rtc.remoteStreams = [];

		function getStreamById(id) {
		    for(var i=0; i<rtc.remoteStreams.length;i++) {
		    	if (rtc.remoteStreams[i].id === id) {return rtc.remoteStreams[i];}
		    }
		}

		rtc.loadData = function () {
			// get list of streams from the server
			$http.get('/streams.json').success(function(streams){
			    // get former state
			    for(var i=0; i<streams.length;i++) {
			    	var stream = getStreamById(streams[i].id);
			    	streams[i].isPlaying = (!!stream) ? stream.isPLaying : false;
			    }
			    // save new streams
			    rtc.remoteStreams = streams;
			});
		};

		rtc.view = function(stream){// add as a peer if not present already
			client.peerInit(stream.id, stream.route);
			stream.isPlaying = !stream.isPlaying;
		};

		//initial load
		rtc.loadData();
	}]);
})();
