var heap = require('heap');

module.export = function(streams){

	var router = function(id, count){
		this.id = id;
		this.count = count;
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
			lightest.count = lightest.count + 1;
			routers.updateItem(lightest);
			list.push(lightest.id);
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
			if(pop!=null){
				// To be implemented
			}
			list.forEach(function(item, index){
				routers.push(item);
			});
		}
	};
};