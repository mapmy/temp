var heap = require('heap');

module.exports = function(streams){

	var router = function(id, count){
		this.id = id;
		this.count = count;
		this.ids = [];
	};

	var unassigned = [];

	var routers = new heap(function(a, b){
		return a.count - b.count;
	});

	function addRemotes(){
		var list = [];
		while(unassigned.length>0){
			var remoteId = unassigned.pop();
			var lightest = routers.peek();
			streams.setRoute(remoteId, lightest.id);
			lightest.ids.push(remoteId);
			lightest.count = lightest.count + 1;
			routers.updateItem(lightest);
			list.push({routerId: lightest.id, remoteId: remoteId});
		}
		return list;
	}

	return {
		addRouter: function(routerId){
			routers.push(new router(routerId, 0));
			return addRemotes();
		},

		addRemote: function(remoteId){
			if(routers.empty()){
				unassigned.push(remoteId);
				return {};
			}else{
				var lightest = routers.peek();
				streams.setRoute(remoteId, lightest.id);
				lightest.count = lightest.count + 1;
				lightest.ids.push(remoteId);
				routers.updateItem(lightest);
				return {id:lightest.id};
			}
		},

		removeRouter: function(routerId){
			var list = [];
			var pop = null;
			while(!routers.empty()){
				pop = routers.pop();
				if(routerId == pop.id){
					break;
				}
				list.push(pop);
			}
			list.forEach(function(item, index){
				routers.push(item);
			});
			if(pop!=null){
				// To be implemented
				for(var i=0; i<pop.count; i++){
					unassigned.push(pop.ids.pop());
				}
				if(!routers.empty()){
					addRemotes();
				}
			}
		}
	};
};