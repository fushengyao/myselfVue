function defineSelfProperty(data, key, val) {
	observe(val);//若果有子对象，则对子对象每个属性进行劫持
	var subContain = new SubContain();
	Object.defineProperty(data, key, {
		configurable: true,
		enumerable: true,
		get: function() {
			//console.log(111111, data[key]);此处不能调用data[key]，相当于调用get方法，会死循环，然后栈溢出
			if (SubContain.target) {
				subContain.addSub(SubContain.target)
			};
			return val;
		},
		set: function(newVal) {
			if (val === newVal) {
				return;
			};
			val = newVal;
			console.log(subContain);
			subContain.notify();//数据变化，通知所有订阅者
			console.log(key + '属性已经被监听', '当前的值为' + newVal)
		}
	})
}

//通过递归的方式，对数据所有属性进行劫持，定义get， set方法
function observe(data) {
	if (!data || typeof data !== 'object') { //如果不是对象  就返回
		return;
	};

	//console.log(Object.keys(data)); //获取对象的键['id', 'name']
	Object.keys(data).forEach(function(key) {
		defineSelfProperty(data, key, data[key])
	})
}

//定义订阅者收集器
function SubContain() {
	this.subs = [];
}

SubContain.prototype = {
	addSub: function(sub) {
		this.subs.push(sub);//添加订阅者
	},
	notify: function() {
		this.subs.forEach(function(sub) {
			sub.update();//更新订阅
		})
	}
}

//定义订阅者
function Watcher(vm, exp, cb) {
	this.vm = vm;
	this.exp = exp;
	this.cb = cb;
	this.value = this.get();
}
Watcher.prototype = {
	update: function() {
		this.run();
	},
	run: function() {
		var newVal = this.vm.data[this.exp];
		var oldVal = this.value;
		if(oldVal !== newVal) {
			this.value = newVal;
			this.cb.call(this.vm, this.value, oldVal);
		}
	},
	get: function() {
		SubContain.target = this;
		var value = this.vm.data[this.exp];
		SubContain.target = null;
		return value;
	}
}

//定义模板语法解析
function SearchNode(options, vm) {
	console.log(options, vm);
	this.el = document.querySelector(options.ele);
	this.vm = vm;
	this.fragment = null;
	this.init();
	return this;
}

SearchNode.prototype = {
	init: function() {
		if (this.el) {
			this.fragment = this.nodeToFragment(this.el);
			this.searchElement(this.fragment);
			this.el.appendChild(this.fragment);
		};
	},
	mapNode: function(el, fragment) {
		var childs = el.childNodes;
		var self = this;
		childs.forEach(function(i) {
			
				fragment.appendChild(i);

			if (i.childNodes.length > 0) {
				self.mapNode(i, fragment)
			};
		})
		return fragment;
	},
	nodeToFragment: function(el) {
		var fragment = document.createDocumentFragment();
		//fragment = this.mapNode(el, fragment);
		var child = el.firstChild
		console.log(111, child, child.nodeType);
		while(child){
			fragment.appendChild(child);
			child = el.firstChild;
		}
		return fragment;
	},
	searchElement: function(el) {
		var childNodes = el.childNodes;
		var self = this;
		var nodeArr = [].slice.call(childNodes);
		nodeArr.forEach(function(i) {
			var reg = /\{\{(.*)\}\}/;
			var text = i.textContent;
			if (self.isTextNode(i) && reg.test(text)) {
				//判断是否符合{{}}规则
				self.resetText(i, reg.exec(text)[1])
			};
			if(i.childNodes && i.childNodes.length) {
				self.searchElement(i);
			}
		})
		
	}, 
	isTextNode: function(node) {
		return node.nodeType == 3
	},
	resetText: function(node, exp) {
		var self = this;
		var initText = this.vm.data[exp];
		this.updateText(node, initText);
		new Watcher(this.vm, exp, function(value) {
			self.updateText(node, value)
		})
	},
	updateText: function(node, value) {
		node.textContent = typeof value == 'undefined' ? '' : value;
	}
}

function MyVue(options) {
	this.data = options.data;
	this.vm = this;
	var self = this;
	observe(this.data);
	Object.keys(this.data).forEach(function(key) {
		self.proxyKeys(key)
	})
	new SearchNode(options, this.vm)
	return this;
}

MyVue.prototype = {
	proxyKeys: function(key) {
		var val = this.data[key];
		Object.defineProperty(this, key, {
			enumerable: false,
			configurable: true,
			get: function() {
				return val;
			},
			set: function(newVal) {
				this.data[key] = newVal;
			}
		})
	}
}
