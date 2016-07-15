var PeerManager = (function () {

  var localId,
      config = {
        peerConnectionConfig: {
          iceServers: [
            {"url": "stun:23.21.150.121"},
            {"url": "stun:stun.l.google.com:19302"}
          ]
        },
        peerConnectionConstraints: {
          optional: [
            {"DtlsSrtpKeyAgreement": true}
          ]
        }
      },
      remoteConnection = null,
      localStream,
      socket = io();
      
  socket.on('message', handleMessage);
  socket.on('id', function(id) {
    localId = id;
  });
      
  function setRemote(remoteId) {
    remoteConnection = new RTCPeerConnection(config.peerConnectionConfig, config.peerConnectionConstraints);
    
    remoteConnection.onicecandidate = function(event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };

    remoteConnection.onaddstream = function(event) {
      // One-way stream
      error('Invalid Command');
    };

    remoteConnection.onremovestream = function(event) {
      error('Invalid Command');
    };

    remoteConnection.oniceconnectionstatechange = function(event) {
      switch(
      (  event.srcElement // Chrome
      || event.target   ) // Firefox
      .iceConnectionState) {
        case 'disconnected':
          break;
      }
    };

    return remoteConnection;
  }

  function offer(remoteId) {
    remoteConnection.createOffer(
      function(sessionDescription) {
        remoteConnection.setLocalDescription(sessionDescription);
        send('offer', remoteId, sessionDescription);
      }, 
      error
    );
  }

  function handleMessage(message) {
    var type = message.type,
        from = message.from,
        pc = remoteConnection || setRemote(from);

    console.log('received ' + type + ' from ' + from);
  
    switch (type) {
      case 'init':
        toggleLocalStream(pc);
        offer(from);// send info. regarding codecs and options supported by the browser
        break;
      case 'answer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        break;
      case 'candidate':
        if(pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: message.payload.label,
            sdpMid: message.payload.id,
            candidate: message.payload.candidate
          }), function(){}, error);
        }
        break;
      default:
        error('Invalid Command');
        break;
    }
  }

  function send(type, to, payload) {
    console.log('sending ' + type + ' to ' + to);

    socket.emit('message', {
      to: to,
      type: type,
      payload: payload
    });
  }

  function toggleLocalStream(pc) {
    if(localStream) {
      (!!pc.getLocalStreams().length) ? pc.removeStream(localStream) : pc.addStream(localStream);
    }
  }

  function error(err){
    console.log(err);
  }

  return {
    getId: function() {
      return localId;
    },
    
    setLocalStream: function(stream) {

      // if local cam has been stopped, remove it from all outgoing streams.
      if(!stream) {
        if(remoteConnection!=null && !!remoteConnection.getLocalStreams().length) {
          remoteConnection.removeStream(localStream);
          offer(localId);
        }
      }

      localStream = stream;
    }, 

    toggleLocalStream: function(remoteId) {
      peer = remoteConnection || setRemote(remoteId);
      toggleLocalStream(peer);
    },

    send: function(type, payload) {
      socket.emit(type, payload);
    },

    close :function(){
      socket.close();
    }
  };
  
});