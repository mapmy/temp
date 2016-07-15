module.exports = function(app, streams) {

  // display incoming streams to router
  var displayStreams = function(req, res){
    res.status(200).json(JSON.parse(JSON.stringify(streams.getStreams())));
  };

  // display sender layout
  var send = function(req, res){
    res.render('send', {});
  };

  // router layout
  var route = function(req, res){
    res.render('route', {});
  };

  // receiver layout
  var receive = function(req, res){
    res.render('receive', {});
  };

  app.get('/streams.json', displayStreams);
  app.get('/send', send);
  app.get('/route', route);
  app.get('/receive', receive);
  // app.get('/:id', receive);
}