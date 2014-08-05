/*!
**  bauer-shell -- Just another wrapper for fs and child_process.
**  Copyright (c) 2014 Yuri Neves Silveira <http://yneves.com>
**  Licensed under The MIT License <http://opensource.org/licenses/MIT>
**  Distributed on <http://github.com/yneves/node-bauer-shell>
*/
// - -------------------------------------------------------------------- - //
// - libs

var lib = {
	fs: require("fs"),
	path: require("path"),
	cp: require("child_process"),
	factory: require("bauer-factory"),
};

// - -------------------------------------------------------------------- - //

var Shell = lib.factory.class({

	constructor: function() {
	},

// - -------------------------------------------------------------------- - //

	rm: {

		// .rm(list)
		a: function(list) {
			for (var i = 0; i < list.length; i++) {
				this.rm(list[i]);
			}
			return this;
		},

		// .rm(file)
		s: function(file) {
			try { lib.fs.unlinkSync(file) } catch(e) {}
			return this;
		},

		// .rm(file,callback)
		sf: function(file,callback) {
			lib.fs.unlink(file,callback);
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	mk: {

		// .mk(dir)
		s: function(dir) {
			lib.fs.mkdirSync(dir);
			return this;
		},

		// .mk(dir,tree)
		sb: function(dir,tree) {
			if (tree) {
				var parts = dir.split("/");
				for (var i = 0; i < parts.length; i++) {
					var temp = [];
					for (var x = 0; x <= i ; x++) {
						temp.push(parts[x]);
					}
					var path = temp.join("/");
					if (path.length > 0) {
						if (!lib.fs.existsSync(path)) {
							lib.fs.mkdirSync(path);
						}
					}
				}
			} else {
				lib.fs.mkdirSync(path);
			}
		},

		// .mk(dir,callback)
		sf: function(dir,callback) {
			lib.fs.mkdir(dir,callback);
			return this;
		},
	},

// - -------------------------------------------------------------------- - //

	mv: {

		// .mv(old,new)
		ss: function(oldpath,newpath) {
			lib.fs.renameSync(oldpath,newpath);
			return this;
		},

		// .mv(old,new,callback)
		ssf: function(oldpath,newpath,callback) {
			lib.fs.rename(oldpath,newpath,callback);
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	ls: {

		// .ls(path) -- sync
		s: function(path) {
			var files = [];
			if (!/\/$/.test(path)) path += "/";
			lib.fs.readdirSync(path).forEach(function(file) {
				files.push(path + file);
			});
			return files;
		},

		// .ls(path,callback) -- async
		sf: function(path,callback) {
			lib.fs.readdir(path,function(err,files) {
				callback(files);
			});
		},

	},

	dirs: {

		// .dirs(path)
		s: "return this.dirs(this.ls(s));",

		// .dirs(list)
		a: function(list) {
			var dirs = [];
			for (var i = 0; i < list.length; i++) {
				if (lib.fs.existsSync(list[i])) {
					var stat = lib.fs.statSync(list[i]);
					if (stat.isDirectory() && !stat.isSymbolicLink()) {
						dirs.push(list[i]);
					}
				}
			}
			return dirs;
		},

	},

	files: {

		// .files(path)
		s: "return this.files(this.ls(s));",

		// .files(list)
		a: function(list) {
			var files = [];
			for (var i = 0; i < list.length; i++) {
				if (lib.fs.existsSync(list[i])) {
					var stat = lib.fs.statSync(list[i]);
					if (stat.isFile() && !stat.isSymbolicLink()) {
						files.push(list[i]);
					}
				}
			}
			return files;
		},

	},

	links: {

		// .links(path)
		s: "return this.links(this.ls(s));",

		// .links(list)
		a: function(list) {
			var links = [];
			for (var i = 0; i < list.length; i++) {
				if (lib.fs.existsSync(list[i])) {
					var stat = lib.fs.statSync(list[i]);
					if (stat.isSymbolicLink()) {
						links.push(list[i]);
					}
				}
			}
			return links;
		},

	},

// - -------------------------------------------------------------------- - //

	cp: {

		// .cp(source,target)
		ss: "return this.cp(s0,s1,false)",

		// .cp(source,target,recurse)
		ssb: function(source,target,recurse) {
			if (this.isDir(source)) {
				if (!this.exists(target)) {
					this.mk(target,true);
				}
				var files = this.files(source);
				for (var i = 0; i < files.length; i++) {
					this.cp(files[i],target + "/" + lib.path.basename(files[i]));
				}
				var links = this.links(source);
				for (var i = 0; i < links.length; i++) {
					this.cp(links[i],target + "/" + lib.path.basename(links[i]));
				}
				if (recurse) {
					var dirs = this.dirs(source);
					for (var i = 0; i < dirs.length; i++) {
						this.cp(dirs[i],target + "/" + lib.path.basename(dirs[i]),recurse);
					}
				}
			} else if (this.isFile(source)) {
				var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
				BUF_LENGTH = 64 * 1024;
				buff = new Buffer(BUF_LENGTH);
				fdr = lib.fs.openSync(source, "r");
				fdw = lib.fs.openSync(target, "w");
				bytesRead = 1;
				pos = 0;
				while (bytesRead > 0) {
					bytesRead = lib.fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
					lib.fs.writeSync(fdw, buff, 0, bytesRead);
					pos += bytesRead;
				}
				lib.fs.closeSync(fdr);
				lib.fs.closeSync(fdw);
			} else if (this.isLink(source)) {
				var srcpath = lib.fs.readlinkSync(source);
				lib.fs.symlinkSync(srcpath,target);
			}
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	// .cwd()
	cwd: "return process.cwd();",

// - -------------------------------------------------------------------- - //

	exists: {

		// .exists(file)
		s: function(file) {
			return lib.fs.existsSync(file);
		},

		// .exists(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,function(exists) {
				callback(exists);
			});
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	isDir: {

		// .isDir(path)
		s: function(path) {
			var isDir = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isDirectory() && !stat.isSymbolicLink()) {
						isDir = true;
					}
				}
			}
			return isDir;
		},

	},

	isFile: {

		// .isFile(path)
		s: function(path) {
			var isFile = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isFile() && !stat.isSymbolicLink()) {
						isFile = true;
					}
				}
			}
			return isFile;
		},

	},

	isLink: {

		// .isLink(path)
		s: function(path) {
			var isLink = false;
			if (this.exists(path)) {
				var stat = lib.fs.lstatSync(path);
				if (stat) {
					if (stat.isSymbolicLink()) {
						isLink = true;
					}
				}
			}
			return isLink;
		},

	},

// - -------------------------------------------------------------------- - //

	size: {

		// .size(file)
		s: function(file) {
			if (lib.fs.existsSync(file)) {
				var stat;
				try { stat = lib.fs.statSync(file) } catch(e) {}
				return stat && stat.size ? stat.size : 0;
			} else {
				return 0;
			}
		},

		// .size(file,callback)
		sf: function(file,callback) {
			lib.fs.exists(file,function(exists) {
				if (exists) {
					lib.fs.stat(file,function(err,stat) {
						callback(stat && stat.size ? stat.size : 0);
					});
				} else {
					callback(0);
				}
			});
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	modified: {

		// .modified(file,text)
		ss: function(file,since) {
			var suffix = since.substr(-1,1);
			var factor = 0;
			if (suffix == "d") {
				factor = 24 * 60 * 60 * 1000;
			} else if (suffix == "w") {
				factor = 7 * 24 * 60 * 60 * 1000;
			} else if (suffix == "h") {
				factor = 60 * 60 * 1000;
			}
			var period = parseInt(since.substr(0,since.length - 1));
			var date = new Date();
			var ms = period * factor;
			date.setTime(date.getTime() - ms)
			return this.modified(file,date);
		},

		// .modified(file,text)
		ssf: function(file,since,callback) {
			var suffix = since.substr(-1,1);
			var factor = 0;
			if (suffix == "d") {
				factor = 24 * 60 * 60 * 1000;
			} else if (suffix == "w") {
				factor = 7 * 24 * 60 * 60 * 1000;
			}
			var period = parseInt(since.substr(0,since.length - 1));
			var date = new Date();
			var ms = period * factor;
			date.setTime(date.getTime() - ms)
			return this.modified(file,date,callback);
		},

		// .modified(file,ms)
		sn: function(file,since) {
			var date = new Date();
			date.setTime(date.getTime() - since);
			return this.modified(file,date);
		},

		// .modified(file,ms,callback)
		snf: function(file,since,callback) {
			var date = new Date();
			date.setTime(date.getTime() - since);
			return this.modified(file,date,callback);
		},

		// .modified(file,date)
		sd: function(file,since) {
			var stats = lib.fs.statSync(file);
			return stats ? stats.mtime < since : true;
		},

		// .modified(file,date,callback)
		sdf: function(file,since,callback) {
			lib.fs.stat(file,function(err,stats) {
				callback(stats ? stats.mtime < since : true);
			});
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	json: {

		// .json(array)
		a: function(arr) {
			return JSON.stringify(arr,null,2);
		},

		// .json(object)
		o: function(obj) {
			return JSON.stringify(obj,null,2);
		},

		// .json(file)
		s: function(file) {
			var content = this.read(file);
			return JSON.parse(content);
		},

	},

// - -------------------------------------------------------------------- - //

	read: {

		// .read(file)
		s: function(file) {
			var data = lib.fs.readFileSync(file,"utf8");
			return data;
		},

		// .read(file,callback)
		sf: function(file,callback) {
			lib.fs.readFile(file,"utf8",function(error,data) {
				callback(data,error);
			});
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	write: {

		// .write(file,object)
		sa: "return this.write(s,JSON.stringify(a,null,2))",
		so: "return this.write(s,JSON.stringify(o,null,2))",

		// .write(file,object,callback)
		saf: "return this.write(s,JSON.stringify(a,null,2),f)",
		sof: "return this.write(s,JSON.stringify(o,null,2),f)",

		// .write(file,content)
		ss: function(file,content) {
			lib.fs.writeFileSync(file,content);
			return this;
		},

		// .write(file,content,callback)
		ssf: function(file,content,callback) {
			lib.fs.writeFile(file,content,function(error) {
				callback(error);
			});
			return this;
		},

	},

// - -------------------------------------------------------------------- - //

	fork: {

		// .fork(options)
		o: "return this.fork(o,function() {})",

		// .fork(options,callback)
		of: function(options,callback) {
			var stdout = [];
			var stderr = [];
			var error = null;
			var proc = lib.cp.fork(options.cmd,options.args,options.opts);
			proc.stdout.on("data",function(data) {
				return stdout.push(data.toString());
			});
			proc.stderr.on("data",function(data) {
				return stderr.push(data.toString());
			});
			proc.on("exit",function(code, signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					stderr: stderr.join(""),
					stdout: stdout.join(""),
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

// - -------------------------------------------------------------------- - //

	spawn: {

		// .spawn(options)
		o: "return this.spawn(o,function() {})",

		// .spawn(options,callback)
		of: function(options,callback) {
	    var stdout = [];
	    var stderr = [];
	    var error = null;
	    var proc = lib.cp.spawn(options.cmd,options.args,options.opts);
	    proc.stdout.on("data",function(data) {
	      return stdout.push(data.toString());
	    });
	    proc.stderr.on("data",function(data) {
	      return stderr.push(data.toString());
	    });
	    proc.on("exit",function(code, signal) {
	      if (code !== 0) {
	        error = new Error(signal);
	      }
	      var results = {
	        stderr: stderr.join(""),
	        stdout: stdout.join(""),
	        code: code
	      };
	      return callback(error,results,code);
	    });
			return proc;
		},

  },

// - -------------------------------------------------------------------- - //

	exec: {

		// .exec(options)
		o: "return this.exec(o,function() {})",

		// .exec(options,callback)
		of: function(options,callback) {
			var stdout = [];
			var stderr = [];
			var error = null;
			var proc = lib.cp.exec(options.cmd,options.args,options.opts);
			proc.stdout.on("data",function(data) {
				return stdout.push(data.toString());
			});
			proc.stderr.on("data",function(data) {
				return stderr.push(data.toString());
			});
			proc.on("exit",function(code, signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					stderr: stderr.join(""),
					stdout: stdout.join(""),
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

// - -------------------------------------------------------------------- - //

	execFile: {

		// .execFile(options)
		o: "return this.execFile(o,function() {})",

		// .execFile(options,callback)
		of: function(options,callback) {
			var stdout = [];
			var stderr = [];
			var error = null;
			var proc = lib.cp.execFile(options.cmd,options.args,options.opts);
			proc.stdout.on("data",function(data) {
				return stdout.push(data.toString());
			});
			proc.stderr.on("data",function(data) {
				return stderr.push(data.toString());
			});
			proc.on("exit",function(code, signal) {
				if (code !== 0) {
					error = new Error(signal);
				}
				var results = {
					stderr: stderr.join(""),
					stdout: stdout.join(""),
					code: code
				};
				return callback(error,results,code);
			});
			return proc;
		},

	},

});

// - -------------------------------------------------------------------- - //

module.exports = new Shell();

// - -------------------------------------------------------------------- - //
