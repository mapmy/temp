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
      peerDatabase = {},
      remoteVideoContainer = document.getElementById('remoteVideosContainer'),
      socket = io();
      
  socket.on('message', handleMessage);
  socket.on('id', function(id) {
    localId = id;
  });
      
  function addIn(remoteId) {
    var peer = new Peer(config.peerConnectionConfig, config.peerConnectionConstraints);
    
    peer.pc.onicecandidate = function(event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };

    peer.pc.onaddstream = function(event) {
      //recording
      recordRTC = new RecordRTC(event.stream);
      recordRTC.startRecording();

      socket.emit('addRoute', remoteId);

      attachMediaStream(peer.remoteVideoEl, event.stream);
      remoteVideosContainer.appendChild(peer.remoteVideoEl);
    };

    peer.pc.onremovestream = function(event) {
      recordRTC.stopRecording(function(){
        recordRTC.save();
      });

      socket.emit('removeRoute', remoteId);

      peer.remoteVideoEl.src = '';
      remoteVideosContainer.removeChild(peer.remoteVideoEl);
    };

    peer.pc.oniceconnectionstatechange = function(event) {
      switch(
      (  event.srcElement // Chrome
      || event.target   ) // Firefox
      .iceConnectionState) {
        case 'disconnected':
          socket.emit('removeRoute', remoteId);
          recordRTC.stopRecording(function(){
            console.log('stopped record');
            recordRTC.save();
            console.log('save complete');
          });
          remoteVideosContainer.removeChild(peer.remoteVideoEl);
          break;
      }
    };

    peerDatabase[remoteId] = peer;
        
    return peer;
  }

  function addOut(remoteId) {
    var peer = new RTCPeerConnection(config.peerConnectionConfig, config.peerConnectionConstraints);
    
    peer.onicecandidate = function(event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };

    peer.onaddstream = function(event) {
      error('Invalid Command');
    };

    peer.onremovestream = function(event) {
      error('Invalid Command');
    };

    peer.oniceconnectionstatechange = function(event) {
      switch(
      (  event.srcElement // Chrome
      || event.target   ) // Firefox
      .iceConnectionState) {
        case 'disconnected':
          break;
      }
    };

    peerDatabase[remoteId] = {pc:peer};
        
    return {pc:peer};
  }

  function answer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createAnswer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('answer', remoteId, sessionDescription);
      }, 
      error
    );
  }

  function offer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createOffer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('offer', remoteId, sessionDescription);
      }, 
      error
    );
  }

  function handleMessage(message) {
    var type = message.type,
        from = message.from,
        pc = null;

    console.log('received ' + type + ' from ' + from);
  
    switch (type) {
      case 'init':
        if(from in peerDatabase){
          pc = peerDatabase[from].pc;
        }else{
          pc = addOut(from).pc;
        }
        addRemoteStreams(message.payload, pc);
        offer(from);// send info. regarding codecs and options supported by the browser
        break;
      case 'offer':
        if(from in peerDatabase){
          pc = peerDatabase[from].pc;
        }else{
          pc = addIn(from).pc;
        }
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        answer(from);// responds with an answer to finalize description
        break;
      case 'answer':
        if(from in peerDatabase){
          pc = peerDatabase[from].pc;
        }else{
          pc = addOut(from).pc;
        }
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        break;
      case 'candidate':
        if(from in peerDatabase){
          pc = peerDatabase[from].pc;
        }else{
          throw 'Shouldn\'t happen...';
        }
        if(pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: message.payload.label,
            sdpMid: message.payload.id,
            candidate: message.payload.candidate
          }), function(){}, error);
        }
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

  function addRemoteStreams(remoteId, pcOut) {
    var streams = peerDatabase[remoteId].pc.getRemoteStreams();
    for(var ind=0; ind<streams.length; ind++){
      if(streams[ind]){
        pcOut.addStream(streams[ind]);
      }
    }
  }

  function error(err){
    console.log(err);
  }

  return {
    getId: function() {
      return localId;
    },
    
    peerInit: function(remoteId) {
      peer = peerDatabase[remoteId] || addIn(remoteId);
      send('init', remoteId, null);
    },

    send: function(type, payload) {
      socket.emit(type, payload);
    },

    close: function(){
      socket.close();
    }
  };
  
});

var Peer = function (pcConfig, pcConstraints) {
  this.pc = new RTCPeerConnection(pcConfig, pcConstraints);
  this.remoteVideoEl = document.createElement('video');
  this.remoteVideoEl.controls = true;
  this.remoteVideoEl.autoplay = true;
}