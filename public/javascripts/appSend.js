(function(){
	var app = angular.module('sendRTC', [],
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

    //TODO: not working
    window.onunload = function(){
    	client.close();
    };

    app.factory('camera', ['$rootScope', '$window', function($rootScope, $window){
    	var camera = {};
    	camera.preview = $window.document.getElementById('localVideo');

    	camera.start = function(){
			return requestUserMedia(mediaConfig)// get mediastreaming obj. using camera
			.then(function(stream){			
				attachMediaStream(camera.preview, stream);
				client.setLocalStream(stream);
				camera.stream = stream;
				$rootScope.$broadcast('cameraIsOn',true);
			})
			.catch(Error('Failed to get access to local media.'));
		};
    	camera.stop = function(){
    		return new Promise(function(resolve, reject){			
				try {
					var audioTracks = camera.stream.getAudioTracks();
					var videoTracks = camera.stream.getVideoTracks();

					// if MediaStream has reference to microphone
					if (audioTracks[0]) {
					    audioTracks[0].enabled = false;
					}

					// if MediaStream has reference to webcam
					if (videoTracks[0]) {
					    videoTracks[0].enabled = false;
					}
					camera.preview.src = '';
					resolve();
				} catch(error) {
					reject(error);
				}
    		})
    		.then(function(result){
    			$rootScope.$broadcast('cameraIsOn',false);
    		});	
		};
		return camera;
    }]);

	// controller for local stream
	app.controller('LocalStreamController',['camera', '$scope', '$window', function(camera, $scope, $window){
		var localStream = this;
		localStream.name = 'Android Phone';
		localStream.cameraIsOn = false;

		$scope.$on('cameraIsOn', function(event,data) {// receive broadcast
    		$scope.$apply(function() {
		    	localStream.cameraIsOn = data;
		    });
		});

		localStream.toggleCam = function(){// called when start/stop pressed
			if(localStream.cameraIsOn){
				camera.stop()
				.then(function(result){
					client.send('leave');
	    			client.setLocalStream(null);// reset localStream
				})
				.catch(function(err) {
					console.log(err);
				});
			} else {
				camera.start()
				.then(function(result) {
					client.send('readyToStream', { name: localStream.name });// send nickname
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};
	}]);
})();
