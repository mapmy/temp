module.exports = function(io, streams, routers) {

  io.on('connection', function(client) {
    console.log('-- ' + client.id + ' joined --');
    // send unique id to client
    client.emit('id', client.id);

    // redirect message to corresponding client
    client.on('message', function (details) {
      var otherClient = io.sockets.connected[details.to];

      if (!otherClient) {
        return;
      }
        delete details.to;
        details.from = client.id;
        otherClient.emit('message', details);
    });
      
    // add stream to incoming
    client.on('readyToStream', function(options) {
      console.log('-- ' + client.id + ' is ready to stream --');
      
      streams.addStream(client.id, options.name); 
      var router = routers.addRemote(client.id);
      if(id in router){
        client.emit('message', {
          from: router.id,
          type: 'init',
          payload: null
        });
      }

    });
    
    // update incoming stream
    client.on('update', function(options) {
      streams.update(client.id, options.name);
    });

    function leave() {
      console.log('-- ' + client.id + ' left --');
      streams.removeStream(client.id);
    }

    client.on('disconnect', leave);
    client.on('leave', leave);

    client.on('addRouter', function(){
      var remoteList = routers.addRouter(client.id);
      remoteList.forEach(function(item, index){
        var otherClient = io.sockets.connected[item];
        otherClient.emit('message', {
          from: client.id,
          type: 'init',
          payload: null
        });
      });
    });

    client.on('removeRouter', function(){
      routers.removeRouter(client.id);
      // TODO
    });
  });
};